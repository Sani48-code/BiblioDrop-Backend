const express = require('express');
const Book = require('../models/Book');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// Lazy-initialize so missing env var doesn't crash the whole app at startup.
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    // Guard: these env vars must be set in Railway (or .env locally)
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ message: 'Server misconfiguration: STRIPE_SECRET_KEY is not set.' });
    }
    if (!process.env.CLIENT_URL) {
      return res.status(500).json({ message: 'Server misconfiguration: CLIENT_URL is not set.' });
    }

    const { bookId } = req.body;
    if (!bookId) {
      return res.status(400).json({ message: 'bookId is required.' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    if (book.status !== 'Published') {
      return res.status(400).json({ message: 'Book is not available for checkout.' });
    }
    if (book.librarianId.toString() === req.user.id) {
      return res.status(403).json({ message: 'You cannot checkout your own book.' });
    }

    const stripe = getStripe();

    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, ''); // strip trailing slash

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: book.title,
              description: `Delivery fee for "${book.title}" by ${book.author}`,
              images: book.imageURL ? [book.imageURL] : [],
            },
            unit_amount: book.deliveryFee * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${clientUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/books/${bookId}`,
      metadata: {
        bookId: bookId.toString(),
        userId: req.user.id.toString(),
        userEmail: req.user.email,
        userName: req.user.name || '',
        librarianId: book.librarianId.toString(),
        librarianEmail: book.librarianEmail,
        deliveryFee: book.deliveryFee.toString(),
        bookTitle: book.title,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe] FULL ERROR:', JSON.stringify(error, null, 2));
    console.error('[Stripe] error.message:', error.message);
    console.error('[Stripe] error.type:', error.type);
    console.error('[Stripe] STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
    console.error('[Stripe] CLIENT_URL:', process.env.CLIENT_URL);
    res.status(500).json({ message: 'Failed to create checkout session.', error: error.message });
  }
});

// POST /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder') {
    console.warn('[Stripe] STRIPE_WEBHOOK_SECRET is not configured — skipping signature verification.');
    return res.json({ received: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature error:', err.message);
    return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { bookId, userId, userEmail, userName, librarianId, librarianEmail, deliveryFee, bookTitle } =
      session.metadata;

    try {
      const order = await Order.create({
        bookId,
        bookTitle,
        userId,
        userEmail,
        userName,
        librarianId,
        librarianEmail,
        deliveryFee: Number(deliveryFee),
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent,
        deliveryStatus: 'Pending',
      });

      await Transaction.create({
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent,
        userEmail,
        librarianEmail,
        bookTitle,
        amount: Number(deliveryFee),
        orderId: order._id,
      });

      await Book.findByIdAndUpdate(bookId, { status: 'Checked Out' });

      console.log(`[Stripe] Order created for book "${bookTitle}" by ${userEmail}`);
    } catch (err) {
      console.error('[Stripe] Webhook handler error:', err.message);
      return res.status(500).json({ message: 'Failed to process payment event.' });
    }
  }

  res.json({ received: true });
});

module.exports = router;

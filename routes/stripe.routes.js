const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Book = require('../models/Book');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { bookId } = req.body;

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
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
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/books/${bookId}`,
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
    res.status(500).json({ message: 'Failed to create checkout session.', error: error.message });
  }
});

// POST /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
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
    } catch (err) {
      console.error('Webhook handler error:', err);
      return res.status(500).json({ message: 'Failed to process payment event.' });
    }
  }

  res.json({ received: true });
});

module.exports = router;

const express = require('express');
const Order = require('../models/Order');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const router = express.Router();

// GET /api/orders/my-orders
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('bookId', 'title imageURL category')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.', error: error.message });
  }
});

// GET /api/orders/librarian-orders
router.get('/librarian-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ librarianEmail: req.user.email })
      .populate('bookId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch librarian orders.', error: error.message });
  }
});

// GET /api/orders/check-delivered
router.get('/check-delivered', verifyToken, async (req, res) => {
  try {
    const { bookId } = req.query;
    if (!bookId) {
      return res.status(400).json({ message: 'bookId query param is required.' });
    }

    const order = await Order.findOne({
      userId: req.user.id,
      bookId,
      deliveryStatus: 'Delivered',
    });

    res.json({ hasDelivered: !!order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check delivery status.', error: error.message });
  }
});

// GET /api/orders/all (admin)
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find()
        .populate('bookId')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(),
    ]);

    res.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all orders.', error: error.message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const isLibrarian = order.librarianEmail === req.user.email;
    const isAdmin = req.user.role === 'admin';
    if (!isLibrarian && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this order.' });
    }

    const progressionMap = {
      Pending: 'Dispatched',
      Dispatched: 'Delivered',
    };
    const allowedNext = progressionMap[order.deliveryStatus];
    if (status !== allowedNext) {
      return res.status(400).json({
        message: `Status can only progress from ${order.deliveryStatus} to ${allowedNext}.`,
      });
    }

    order.deliveryStatus = status;
    await order.save();

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status.', error: error.message });
  }
});

module.exports = router;

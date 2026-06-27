const express = require('express');
const User = require('../models/User');
const Book = require('../models/Book');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const router = express.Router();

// GET /api/admin/users
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);

    res.json({ users, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'librarian', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be user, librarian, or admin.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update role.', error: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user.', error: error.message });
  }
});

// GET /api/admin/books/pending
router.get('/books/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const books = await Book.find({ status: 'Pending Approval' })
      .populate('librarianId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ books });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending books.', error: error.message });
  }
});

// PATCH /api/admin/books/:id/approve
router.patch('/books/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status: 'Published' },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve book.', error: error.message });
  }
});

// PATCH /api/admin/books/:id/unpublish
router.patch('/books/:id/unpublish', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { status: 'Unpublished' },
      { new: true }
    );
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unpublish book.', error: error.message });
  }
});

// DELETE /api/admin/books/:id
router.delete('/books/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.json({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete book.', error: error.message });
  }
});

// GET /api/admin/transactions
router.get('/transactions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(),
    ]);

    res.json({ transactions, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions.', error: error.message });
  }
});

// GET /api/admin/analytics
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalUsers,
      totalBooks,
      totalOrders,
      revenueResult,
      booksByCategory,
      monthlyRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      Book.countDocuments(),
      Order.countDocuments(),
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Book.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalBooks,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      booksByCategory,
      monthlyRevenue,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics.', error: error.message });
  }
});

module.exports = router;

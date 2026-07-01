const express = require('express');
const Review = require('../models/Review');
const Order = require('../models/Order');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// GET /api/reviews?bookId=xxx  (query-param style — frontend compatibility)
router.get('/', async (req, res) => {
  try {
    const { bookId } = req.query;
    if (!bookId) {
      return res.status(400).json({ message: 'bookId query parameter is required.' });
    }

    const reviews = await Review.find({ bookId })
      .populate('userId', 'name photoURL')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    res.json({ reviews, averageRating: Math.round(averageRating * 10) / 10, totalReviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews.', error: error.message });
  }
});

// GET /api/reviews/book/:bookId  (path-param style — kept for backwards compat)
router.get('/book/:bookId', async (req, res) => {
  try {
    const reviews = await Review.find({ bookId: req.params.bookId })
      .populate('userId', 'name photoURL')
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    res.json({ reviews, averageRating: Math.round(averageRating * 10) / 10, totalReviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews.', error: error.message });
  }
});

// GET /api/reviews/my-reviews
router.get('/my-reviews', verifyToken, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id })
      .populate('bookId', 'title imageURL')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your reviews.', error: error.message });
  }
});

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookId, rating, comment } = req.body;

    const deliveredOrder = await Order.findOne({
      userId: req.user.id,
      bookId,
      deliveryStatus: 'Delivered',
    });
    if (!deliveredOrder) {
      return res.status(403).json({ message: 'You must receive this book before reviewing.' });
    }

    const existing = await Review.findOne({ bookId, userId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this book.' });
    }

    const review = await Review.create({
      bookId,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      userPhoto: '',
      rating,
      comment,
    });

    res.status(201).json({ review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit review.', error: error.message });
  }
});

// PUT /api/reviews/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this review.' });
    }

    const { rating, comment } = req.body;
    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update review.', error: error.message });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this review.' });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete review.', error: error.message });
  }
});

module.exports = router;

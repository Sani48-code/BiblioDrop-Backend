const express = require('express');
const Wishlist = require('../models/Wishlist');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// GET /api/wishlist
router.get('/', verifyToken, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user.id }).populate('bookId');
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wishlist.', error: error.message });
  }
});

// POST /api/wishlist
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookId } = req.body;

    const existing = await Wishlist.findOne({ userId: req.user.id, bookId });
    if (existing) {
      return res.status(400).json({ message: 'Book is already in your wishlist.' });
    }

    const item = await Wishlist.create({ userId: req.user.id, bookId });
    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to wishlist.', error: error.message });
  }
});

// DELETE /api/wishlist/:bookId
router.delete('/:bookId', verifyToken, async (req, res) => {
  try {
    const result = await Wishlist.findOneAndDelete({
      userId: req.user.id,
      bookId: req.params.bookId,
    });

    if (!result) {
      return res.status(404).json({ message: 'Wishlist item not found.' });
    }

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove from wishlist.', error: error.message });
  }
});

module.exports = router;

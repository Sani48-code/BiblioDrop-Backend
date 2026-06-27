const express = require('express');
const Book = require('../models/Book');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// GET /api/books/librarian/my-books — must be before /:id to avoid route conflict
router.get('/librarian/my-books', verifyToken, async (req, res) => {
  try {
    const books = await Book.find({ librarianId: req.user.id }).sort({ createdAt: -1 });
    res.json({ books });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch books.', error: error.message });
  }
});

// GET /api/books (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const { search, category, minFee, maxFee, availability, sort, page = 1, limit = 6 } = req.query;

    const filter = { status: 'Published' };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (minFee || maxFee) {
      filter.deliveryFee = {};
      if (minFee) filter.deliveryFee.$gte = Number(minFee);
      if (maxFee) filter.deliveryFee.$lte = Number(maxFee);
    }

    if (availability === 'available') {
      filter.status = 'Published';
    } else if (availability === 'checked-out') {
      filter.status = 'Checked Out';
      delete filter.status;
      filter.status = 'Checked Out';
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      'fee-asc': { deliveryFee: 1 },
      'fee-desc': { deliveryFee: -1 },
    };
    const sortOption = sortMap[sort] || { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      Book.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Book.countDocuments(filter),
    ]);

    res.json({
      books,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch books.', error: error.message });
  }
});

// GET /api/books/:id (PUBLIC)
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('librarianId', 'name email photoURL');
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch book.', error: error.message });
  }
});

// POST /api/books (verifyToken, librarian only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'librarian') {
      return res.status(403).json({ message: 'Only librarians can add books.' });
    }

    const { title, author, description, category, deliveryFee, imageURL } = req.body;
    const book = await Book.create({
      title,
      author,
      description,
      category,
      deliveryFee,
      imageURL: imageURL || '',
      librarianId: req.user.id,
      librarianEmail: req.user.email,
      status: 'Pending Approval',
    });

    res.status(201).json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create book.', error: error.message });
  }
});

// PUT /api/books/:id (verifyToken)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const isOwner = book.librarianId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this book.' });
    }

    const { title, author, description, category, deliveryFee, imageURL } = req.body;
    const updated = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, description, category, deliveryFee, imageURL },
      { new: true, runValidators: true }
    );

    res.json({ book: updated });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update book.', error: error.message });
  }
});

// DELETE /api/books/:id (verifyToken)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const isOwner = book.librarianId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this book.' });
    }

    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete book.', error: error.message });
  }
});

// PATCH /api/books/:id/toggle-publish (verifyToken)
router.patch('/:id/toggle-publish', verifyToken, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    const isOwner = book.librarianId.toString() === req.user.id;
    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to toggle this book.' });
    }

    if (book.status !== 'Published' && book.status !== 'Unpublished') {
      return res.status(400).json({ message: 'Book cannot be toggled in its current status.' });
    }

    book.status = book.status === 'Published' ? 'Unpublished' : 'Published';
    await book.save();

    res.json({ book });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle publish status.', error: error.message });
  }
});

module.exports = router;

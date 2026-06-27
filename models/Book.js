const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['Fiction', 'Sci-Fi', 'Academic', 'History', 'Biography', 'Technology', 'Children', 'Other'],
    required: true
  },
  deliveryFee: { type: Number, required: true, min: 1 },
  imageURL: { type: String, default: '' },
  librarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  librarianEmail: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending Approval', 'Published', 'Unpublished', 'Checked Out'],
    default: 'Pending Approval'
  },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);

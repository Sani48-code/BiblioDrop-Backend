const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  bookTitle: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  librarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  librarianEmail: { type: String, required: true },
  deliveryFee: { type: Number, required: true },
  stripeSessionId: { type: String },
  stripePaymentId: { type: String },
  deliveryStatus: {
    type: String,
    enum: ['Pending', 'Dispatched', 'Delivered'],
    default: 'Pending'
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

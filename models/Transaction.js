const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  stripeSessionId: { type: String, required: true },
  stripePaymentId: { type: String },
  userEmail: { type: String, required: true },
  librarianEmail: { type: String, required: true },
  bookTitle: { type: String, required: true },
  amount: { type: Number, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);

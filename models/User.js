const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  photoURL: { type: String, default: '' },
  role: { type: String, enum: ['user', 'librarian', 'admin'], default: 'user' },
  provider: { type: String, default: 'email' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

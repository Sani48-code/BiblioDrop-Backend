require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

const createUsers = async () => {
  await connectDB();

  // Admin
  const adminExists = await User.findOne({ email: 'admin@gmail.com' });
  if (adminExists) {
    console.log('Admin already exists — skipping');
  } else {
    const hashed = await bcrypt.hash('Admin@123', 10);
    await User.create({ name: 'Admin', email: 'admin@gmail.com', password: hashed, role: 'admin' });
    console.log('Admin user created: admin@gmail.com / Admin@123');
  }

  // Librarian
  const librarianExists = await User.findOne({ email: 'librarian@gmail.com' });
  if (librarianExists) {
    console.log('Librarian already exists — skipping');
  } else {
    const hashed = await bcrypt.hash('Librarian@123', 10);
    await User.create({ name: 'Default Librarian', email: 'librarian@gmail.com', password: hashed, role: 'librarian' });
    console.log('Librarian user created: librarian@gmail.com / Librarian@123');
  }

  await mongoose.disconnect();
  console.log('Done. MongoDB disconnected.');
  process.exit(0);
};

createUsers().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

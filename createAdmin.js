require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

const USERS = [
  { name: 'Admin',             email: 'admin@gmail.com',     password: 'Admin@123',     role: 'admin' },
  { name: 'Default Librarian', email: 'librarian@gmail.com', password: 'Librarian@123', role: 'librarian' },
];

const run = async () => {
  await connectDB();

  for (const u of USERS) {
    // Delete any existing record (regardless of how it was created)
    const deleted = await User.deleteOne({ email: u.email });
    if (deleted.deletedCount > 0) {
      console.log(`  DELETED  existing ${u.role}: ${u.email}`);
    }

    // Create fresh with bcryptjs hash (salt rounds = 10, same as login route)
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({
      name:     u.name,
      email:    u.email,
      password: hashed,
      role:     u.role,
      provider: 'email',
    });
    console.log(`  CREATED  ${u.role}: ${u.email}`);

    // Verify the hash works exactly as the login route does
    const saved = await User.findOne({ email: u.email });
    const match = await bcrypt.compare(u.password, saved.password);
    if (!match) {
      console.error(`  ERROR    bcrypt.compare failed for ${u.email} — something is very wrong`);
      process.exit(1);
    }
    console.log(`  VERIFIED bcrypt.compare("${u.password}", hash) => true`);
  }

  console.log('\nAll users created and verified successfully.');
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

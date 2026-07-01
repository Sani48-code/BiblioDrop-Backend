require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');
const connectDB = require('./config/db');

const UPDATES = [
  { title: 'The Alchemist',                         imageURL: 'https://covers.openlibrary.org/b/id/8327507-L.jpg' },
  { title: 'Atomic Habits',                         imageURL: 'https://covers.openlibrary.org/b/id/10309819-L.jpg' },
  { title: 'To Kill a Mockingbird',                 imageURL: 'https://covers.openlibrary.org/b/id/8228691-L.jpg' },
  { title: 'A Brief History of Time',               imageURL: 'https://covers.openlibrary.org/b/id/7895259-L.jpg' },
  { title: 'The Great Gatsby',                      imageURL: 'https://covers.openlibrary.org/b/id/7222246-L.jpg' },
  { title: 'Dune',                                  imageURL: 'https://covers.openlibrary.org/b/id/10973798-L.jpg' },
  { title: 'Sapiens',                               imageURL: 'https://covers.openlibrary.org/b/id/10164408-L.jpg' },
  { title: "Harry Potter and the Sorcerer's Stone", imageURL: 'https://covers.openlibrary.org/b/id/10110415-L.jpg' },
  { title: 'The Lean Startup',                      imageURL: 'https://covers.openlibrary.org/b/id/7981994-L.jpg' },
  { title: '1984',                                  imageURL: 'https://covers.openlibrary.org/b/id/7222246-L.jpg' },
];

const run = async () => {
  await connectDB();

  let updated = 0;
  let notFound = 0;

  for (const { title, imageURL } of UPDATES) {
    const result = await Book.updateOne(
      { title },
      { $set: { imageURL, status: 'Published' } }
    );

    if (result.matchedCount === 0) {
      console.log(`  NOT FOUND  "${title}"`);
      notFound++;
    } else {
      console.log(`  UPDATED    "${title}"`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${notFound} not found.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});

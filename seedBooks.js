require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Book = require('./models/Book');
const connectDB = require('./config/db');

const books = [
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    description: 'A philosophical novel about a young Andalusian shepherd on a journey to find treasure and follow his personal legend.',
    category: 'Fiction',
    deliveryFee: 50,
    imageURL: 'https://covers.openlibrary.org/b/title/The+Alchemist-L.jpg',
    status: 'Published',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'A practical guide on how tiny changes in behavior can lead to remarkable results through the power of habits.',
    category: 'Self-Help',
    deliveryFee: 40,
    imageURL: 'https://covers.openlibrary.org/b/title/Atomic+Habits-L.jpg',
    status: 'Published',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    description: 'A Pulitzer Prize-winning novel set in the American South addressing racial injustice and moral growth through the eyes of young Scout Finch.',
    category: 'Fiction',
    deliveryFee: 45,
    imageURL: 'https://covers.openlibrary.org/b/title/To+Kill+a+Mockingbird-L.jpg',
    status: 'Published',
  },
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    description: 'Stephen Hawking explores the origins, structure, and ultimate fate of the universe in this landmark work of popular science.',
    category: 'Science',
    deliveryFee: 55,
    imageURL: 'https://covers.openlibrary.org/b/title/A+Brief+History+of+Time-L.jpg',
    status: 'Published',
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'A story of wealth, obsession, and the American Dream set in the glamorous and decadent Jazz Age of the 1920s.',
    category: 'Fiction',
    deliveryFee: 40,
    imageURL: 'https://covers.openlibrary.org/b/title/The+Great+Gatsby-L.jpg',
    status: 'Published',
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    description: 'An epic science fiction saga set on the desert planet Arrakis, exploring politics, religion, ecology, and human evolution.',
    category: 'Sci-Fi',
    deliveryFee: 60,
    imageURL: 'https://covers.openlibrary.org/b/title/Dune-L.jpg',
    status: 'Published',
  },
  {
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    description: 'A sweeping narrative of human history from the Stone Age to the present, exploring how Homo sapiens came to dominate the world.',
    category: 'Academic',
    deliveryFee: 55,
    imageURL: 'https://covers.openlibrary.org/b/title/Sapiens-L.jpg',
    status: 'Published',
  },
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: 'J.K. Rowling',
    description: 'The first book in the beloved Harry Potter series, following a young wizard as he discovers his magical heritage and begins his education at Hogwarts.',
    category: 'Fantasy',
    deliveryFee: 50,
    imageURL: "https://covers.openlibrary.org/b/title/Harry+Potter+and+the+Sorcerer's+Stone-L.jpg",
    status: 'Published',
  },
  {
    title: 'The Lean Startup',
    author: 'Eric Ries',
    description: 'A methodology for building successful businesses by using continuous innovation and validated learning to reduce wasted time and resources.',
    category: 'Business',
    deliveryFee: 45,
    imageURL: 'https://covers.openlibrary.org/b/title/The+Lean+Startup-L.jpg',
    status: 'Published',
  },
  {
    title: '1984',
    author: 'George Orwell',
    description: 'A dystopian novel depicting a totalitarian society ruled by Big Brother, exploring surveillance, propaganda, and the destruction of individual freedom.',
    category: 'Sci-Fi',
    deliveryFee: 40,
    imageURL: 'https://covers.openlibrary.org/b/title/1984-L.jpg',
    status: 'Published',
  },
];

const seedBooks = async () => {
  await connectDB();

  const librarian = await User.findOne({ email: 'librarian@gmail.com' });
  if (!librarian) {
    console.error('Librarian not found. Run node createAdmin.js first.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const bookData of books) {
    const exists = await Book.findOne({ title: bookData.title });
    if (exists) {
      console.log(`  SKIP  "${bookData.title}" already exists`);
      skipped++;
      continue;
    }
    await Book.create({
      ...bookData,
      librarianId: librarian._id,
      librarianEmail: librarian.email,
    });
    console.log(`  OK    "${bookData.title}"`);
    created++;
  }

  console.log(`\nDone. ${created} books created, ${skipped} skipped.`);
  await mongoose.disconnect();
  process.exit(0);
};

seedBooks().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

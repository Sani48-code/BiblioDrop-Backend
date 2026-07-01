const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function userPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    photoURL: user.photoURL,
  };
}

// ─── Core handlers (reused by both path styles) ──────────────────────────────

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }
    if (!user.password) {
      return res.status(401).json({ message: 'This account uses Google sign-in. No password set.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ token, user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
}

async function handleRegister(req, res) {
  try {
    const { name, email, password, photoURL, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      photoURL: photoURL || '',
      role: role || 'user',
      provider: 'email',
    });

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ token, user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
}

function handleLogout(req, res) {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ message: 'Logged out successfully' });
}

async function handleMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user.', error: error.message });
  }
}

// ─── Standard JWT routes ──────────────────────────────────────────────────────

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.get('/me', verifyToken, handleMe);

// ─── Better Auth–compatible route aliases ────────────────────────────────────
// Frontend Better Auth clients call these paths by default.

router.post('/sign-up/email', handleRegister);
router.post('/sign-in/email', handleLogin);
router.post('/sign-out', handleLogout);
router.get('/get-session', verifyToken, handleMe);

// ─── Google / OAuth ───────────────────────────────────────────────────────────

router.post('/google', async (req, res) => {
  try {
    const { name, email, photoURL, provider, role } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name,
        email,
        photoURL: photoURL || '',
        provider: provider || 'google',
        role: role || 'user',
      });
    }

    const token = signToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ token, user: userPayload(user) });
  } catch (error) {
    res.status(500).json({ message: 'Google auth failed.', error: error.message });
  }
});

module.exports = router;

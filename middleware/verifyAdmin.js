const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = verifyAdmin;

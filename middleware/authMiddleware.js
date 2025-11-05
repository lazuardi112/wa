const db = require('../models');

const protect = async (req, res, next) => {
  if (req.session.user) {
    try {
      // Attach user object from database to request for downstream middleware
      const user = await db.User.findByPk(req.session.user.id, {
        attributes: { exclude: ['password'] }
      });
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      req.user = user;
      next();
    } catch(error) {
      return res.status(500).json({ message: 'Server error during authentication' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no session' });
  }
};

const admin = (req, res, next) => {
  // protect middleware should run first to attach req.user
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };

// middleware/isAdmin.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Check if the authenticated user exists and is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    next(); // User is admin, proceed to next middleware or route
  } catch (error) {
    res.status(500).json({ message: 'Error validating admin access', error });
  }
};

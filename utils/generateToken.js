const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token
 * @param {String} id - User ID or payload to encode
 * @param {String} role - (Optional) User role
 * @param {String} expiresIn - Expiration time (default: '7d')
 */
const generateToken = (id, role = null, expiresIn = '7d') => {
  const payload = role ? { id, role } : { id };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn
  });
};

module.exports = generateToken;

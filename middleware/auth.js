// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = function validate(fields) {
  return (req, res, next) => {
    for (let field of fields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `${field} is required`
        });
      }
    }
    next();
  };
};
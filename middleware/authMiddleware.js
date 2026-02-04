require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Extract token if using Bearer scheme
  if (token.startsWith('Bearer ')) {
    token = token.split(' ')[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
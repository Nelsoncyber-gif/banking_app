require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        message: 'No token, authorization denied',
        success: false
      });
    }

    // Remove 'Bearer ' prefix
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({
        message: 'Token is required',
        success: false
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;

    next();

  } catch (err) {
    console.error('Auth middleware error:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired, please login again',
        success: false
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        success: false
      });
    }

    res.status(401).json({
      message: 'Token is not valid',
      success: false
    });
  }
};

exports.adminOnly = (req, res, next) => {
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    return res.status(403).json({
      message: "Access denied. Admins only."
    });
  }
  next();
};

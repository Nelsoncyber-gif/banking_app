require('dotenv').config();
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({ 
        message: 'No token provided', 
        success: false 
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    let token = authHeader;
    if (token.startsWith('Bearer ')) {
      token = token.split(' ')[1].trim();
    }

    if (!token) {
      return res.status(401).json({ 
        message: 'Token is required', 
        success: false 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
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

    return res.status(401).json({ 
      message: 'Token is not valid', 
      success: false 
    });
  }
};
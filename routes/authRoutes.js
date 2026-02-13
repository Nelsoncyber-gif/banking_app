const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

console.log("Auth routes file loaded - proper version");

// ==================== AUTHENTICATION ====================

router.post(
  '/register', 
  validate(['first_name', 'last_name', 'email', 'password']), 
  register
);

router.post(
  '/login', 
  validate(['email', 'password']), 
  login
);

router.post('/logout', protect, logout);

// ==================== USER PROFILE ====================

router.get('/profile', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// ==================== TEST ROUTES ====================

router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: "Auth routes are working", 
    timestamp: new Date().toISOString()
  });
});

router.post('/test-register', (req, res) => {
  console.log('Test register called with:', req.body);
  res.status(200).json({
    success: true,
    message: 'Test successful - route exists',
    receivedData: req.body
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const validate = require('../middleware/validation');
const { protect } = require('../middleware/auth');

console.log("Auth routes file loaded - proper version");

// ==================== AUTHENTICATION ====================

/**
 * Register a new user
 * @body {string} first_name - Required
 * @body {string} last_name - Required
 * @body {string} email - Required
 * @body {string} password - Required
 * @body {string} phone - Optional
 */
router.post(
  '/register', 
  validate(['first_name', 'last_name', 'email', 'password']), 
  register
);

/**
 * Login user
 * @body {string} email - Required
 * @body {string} password - Required
 */
router.post(
  '/login', 
  validate(['email', 'password']), 
  login
);

/**
 * Logout user (invalidate token)
 * @auth Required
 */
router.post('/logout', protect, logout);

// ==================== USER PROFILE ====================

/**
 * Get current user profile
 * @auth Required
 */
router.get('/profile', protect, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// ==================== TEST ROUTES ====================

/**
 * Health check for auth routes
 */
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: "Auth routes are working", 
    timestamp: new Date().toISOString()
  });
});

/**
 * Test registration endpoint (for debugging)
 */
router.post('/test-register', (req, res) => {
  console.log('Test register called with:', req.body);
  res.status(200).json({
    success: true,
    message: 'Test successful - route exists',
    receivedData: req.body
  });
});

module.exports = router;
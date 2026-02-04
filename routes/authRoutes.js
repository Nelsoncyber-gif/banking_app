const express = require('express');
const router = express.Router();

const validate = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { 
  register, 
  login, 
  profile, 
  updateProfile,
  changePassword 
} = require('../controllers/authController');

// Log to confirm loading
console.log("Auth routes file loaded");

// ==================== PUBLIC ROUTES ====================

/**
 * Register new user
 * @body {string} first_name - Required
 * @body {string} last_name - Required
 * @body {string} email - Required
 * @body {string} password - Required (min 6 chars)
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

// ==================== PROTECTED ROUTES ====================

/**
 * Get user profile
 * @auth Required
 */
router.get('/profile', protect, profile);

/**
 * Update user profile
 * @auth Required
 * @body {string} first_name - Required
 * @body {string} last_name - Required
 * @body {string} phone - Optional
 */
router.put('/profile', protect, updateProfile);

/**
 * Change password
 * @auth Required
 * @body {string} oldPassword - Required
 * @body {string} newPassword - Required (min 6 chars)
 */
router.post('/change-password', protect, changePassword);

// ==================== TEST ROUTE ====================

/**
 * Health check
 */
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: "Auth routes are alive", 
    status: "ok" 
  });
});

module.exports = router;
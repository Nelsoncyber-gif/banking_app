const validate = require('../middleware/validation');

console.log("Auth routes file loaded");

const express = require('express');
const router = express.Router();

// Import controllers
const { register, login, profile } = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/auth');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100
});

app.use(limiter);

// Define routes
router.post('/register', register);
router.post('/login', login);

// Protected route
router.get('/profile', protect, profile);

// Simple test route
router.get('/test', (req, res) => {
  res.send("Auth route is alive");
});

router.post('/change-password', protect, changePassword);

router.post('/deposit', protect, deposit);

router.post('/withdraw', protect, withdraw);

router.post('/transfer', protect, transfer);

router.get('/transactions', protect, transactions);

router.post('/register', validate(['email','password']), register);
router.post('/login', validate(['email','password']), login);

router.post('/deposit', protect, validate(['accountId','amount']), deposit);
router.post('/withdraw', protect, validate(['accountId','amount']), withdraw);
router.post('/transfer', protect, validate(['fromAccount','toAccount','amount']), transfer);

module.exports = router;
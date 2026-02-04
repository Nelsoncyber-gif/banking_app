const express = require('express');
const router = express.Router();

const validate = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { 
  deposit, 
  withdraw, 
  transfer, 
  transactions 
} = require('../controllers/authController');

// Log to confirm loading
console.log("Account routes file loaded");

// Protected banking routes
router.post('/deposit', 
  protect, 
  validate(['accountId', 'amount']), 
  deposit
);

router.post('/withdraw', 
  protect, 
  validate(['accountId', 'amount']), 
  withdraw
);

router.post('/transfer', 
  protect, 
  validate(['fromAccount', 'toAccount', 'amount']), 
  transfer
);

router.get('/transactions', 
  protect, 
  transactions
);

// Simple test route
router.get('/test', (req, res) => {
  res.send("Account routes are alive");
});

module.exports = router;
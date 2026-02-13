const express = require('express');
const router = express.Router();

const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { 
  createAccount,
  getAccounts,
  deposit, 
  withdraw, 
  transfer, 
  transactions 
} = require('../controllers/accountController');

// Log to confirm loading
console.log("Account routes file loaded");

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Create a new bank account for the authenticated user
 * @route POST /api/accounts/create-account
 * @access Protected
 */
router.post('/create-account', protect, createAccount);

/**
 * Get all accounts for the authenticated user
 * @route GET /api/accounts/get-accounts
 * @access Protected
 */
router.get('/get-accounts', protect, getAccounts);

// ==================== BANKING OPERATIONS ====================

/**
 * Deposit money into an account
 * @route POST /api/accounts/deposit
 * @access Protected
 * @body {number} accountId - Required (account ID)
 * @body {number} amount - Required (positive number)
 */
router.post(
  '/deposit', 
  protect, 
  validate(['accountId', 'amount']), 
  deposit
);

/**
 * Withdraw money from an account
 * @route POST /api/accounts/withdraw
 * @access Protected
 * @body {number} accountId - Required (account ID)
 * @body {number} amount - Required (positive number)
 */
router.post(
  '/withdraw', 
  protect, 
  validate(['accountId', 'amount']), 
  withdraw
);

/**
 * Transfer money between accounts
 * @route POST /api/accounts/transfer
 * @access Protected
 * @body {number} fromAccount - Required (source account ID)
 * @body {number} toAccount - Required (destination account ID)
 * @body {number} amount - Required (positive number)
 */
router.post(
  '/transfer', 
  protect, 
  validate(['fromAccount', 'toAccount', 'amount']), 
  transfer
);

// ==================== TRANSACTION HISTORY ====================

/**
 * Get transaction history for user's accounts
 * @route GET /api/accounts/transactions
 * @access Protected
 * @query {number} page - Optional (default: 1)
 * @query {number} limit - Optional (default: 10)
 */
router.get('/transactions', protect, transactions);

// ==================== TEST ROUTE ====================

/**
 * Health check for account routes
 * @route GET /api/accounts/test
 * @access Public
 */
router.get('/test', (req, res) => {
  res.status(200).json({
    message: "Account routes are alive",
    status: "ok"
  });
});


module.exports = router;
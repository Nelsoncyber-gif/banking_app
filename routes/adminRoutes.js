const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/auth');

const {
  getAllUsers,
  getAllTransactions,
  freezeAccount,
  unfreezeAccount
} = require('../controllers/adminController');

router.get('/users', protect, adminOnly, getAllUsers);

router.get('/transactions', protect, adminOnly, getAllTransactions);

router.post('/freeze', protect, adminOnly, freezeAccount);

router.post('/unfreeze', protect, adminOnly, unfreezeAccount);

module.exports = router;
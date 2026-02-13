const pool = require('../config/db');

// ==================== CREATE ACCOUNT ====================
exports.createAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Generate a unique account number
    const accountNumber = 'ACC' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_number, balance)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, accountNumber, 0]
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to create account"
    });
  }
};

// ==================== GET USER ACCOUNTS ====================
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM accounts WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      success: true,
      accounts: result.rows
    });

  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve accounts"
    });
  }
};

// ==================== DEPOSIT ====================
exports.deposit = async (req, res) => {
  try {
    const { accountId, amount } = req.body;

    // Get account details to retrieve account number
    const accountDetails = await pool.query(
      `SELECT account_number FROM accounts WHERE id = $1`,
      [accountId]
    );

    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, accountId]
    );

    await pool.query(
      `INSERT INTO transactions (account_id, type, amount, receiver_account)
       VALUES ($1, $2, $3, $4)`,
      [accountId, 'deposit', amount, accountDetails.rows[0].account_number]
    );

    res.status(200).json({
      success: true,
      message: "Deposit successful"
    });

  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({
      success: false,
      message: "Deposit failed"
    });
  }
};

// ==================== WITHDRAW ====================
exports.withdraw = async (req, res) => {
  try {
    const { accountId, amount } = req.body;

    // Get account details to retrieve account number
    const account = await pool.query(
      `SELECT balance, account_number FROM accounts WHERE id = $1`,
      [accountId]
    );

    if (account.rows[0].balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds"
      });
    }

    await pool.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [amount, accountId]
    );

    await pool.query(
      `INSERT INTO transactions (account_id, type, amount, sender_account)
       VALUES ($1, $2, $3, $4)`,
      [accountId, 'withdraw', amount, account.rows[0].account_number]
    );

    res.status(200).json({
      success: true,
      message: "Withdrawal successful"
    });

  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({
      success: false,
      message: "Withdrawal failed"
    });
  }
};

// ==================== TRANSFER ====================
exports.transfer = async (req, res) => {
  try {
    const { fromAccount, toAccount, amount } = req.body;

    // Get account details to retrieve account numbers
    const fromAccountDetails = await pool.query(
      `SELECT balance, account_number FROM accounts WHERE id = $1`,
      [fromAccount]
    );

    const toAccountDetails = await pool.query(
      `SELECT account_number FROM accounts WHERE id = $1`,
      [toAccount]
    );

    if (fromAccountDetails.rows[0].balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient funds for transfer"
      });
    }

    // Perform the transfer
    await pool.query(
      `UPDATE accounts SET balance = balance - $1 WHERE id = $2`,
      [amount, fromAccount]
    );

    await pool.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id = $2`,
      [amount, toAccount]
    );

    // Record the transaction with sender and receiver account numbers
    await pool.query(
      `INSERT INTO transactions (account_id, type, amount, sender_account, receiver_account)
       VALUES ($1, $2, $3, $4, $5)`,
      [fromAccount, 'transfer', amount, fromAccountDetails.rows[0].account_number, toAccountDetails.rows[0].account_number]
    );

    res.status(200).json({
      success: true,
      message: "Transfer successful"
    });

  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({
      success: false,
      message: "Transfer failed"
    });
  }
};

// ==================== TRANSACTION HISTORY ====================
exports.transactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT t.* FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE a.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      transactions: result.rows
    });

  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transactions"
    });
  }
};

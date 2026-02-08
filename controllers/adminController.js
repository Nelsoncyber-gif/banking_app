const pool = require('../config/db');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await pool.query(
      "SELECT id, first_name, last_name, email, phone, role FROM users"
    );

    res.json({
      success: true,
      users: users.rows
    });

  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM transactions ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      transactions: result.rows
    });

  } catch (err) {
    console.error('Get all transactions error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.freezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'frozen' WHERE id = $1 RETURNING *",
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ 
      success: true,
      message: "Account frozen successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Freeze account error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.unfreezeAccount = async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ message: "Account ID is required" });
    }

    const result = await pool.query(
      "UPDATE accounts SET status = 'active' WHERE id = $1 RETURNING *",
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({ 
      success: true,
      message: "Account reactivated successfully",
      account: result.rows[0]
    });

  } catch (err) {
    console.error('Unfreeze account error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ ADDED: Check account status helper (optional but useful)
exports.checkAccountStatus = async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await pool.query(
      "SELECT id, account_number, balance, status FROM accounts WHERE id = $1",
      [accountId]
    );

    if (account.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const acc = account.rows[0];
    
    if (acc.status === 'frozen') {
      return res.status(403).json({
        success: false,
        message: "This account is frozen",
        account: acc
      });
    }

    res.json({
      success: true,
      message: "Account is active",
      account: acc
    });

  } catch (err) {
    console.error('Check account status error:', err);
    res.status(500).json({ error: err.message });
  }
};
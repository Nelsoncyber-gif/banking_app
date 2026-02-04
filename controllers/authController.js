const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ==================== AUTH CONTROLLERS ====================

exports.register = async (req, res) => {
  const { first_name, last_name, email, password, phone } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users(first_name, last_name, email, password, phone) VALUES($1,$2,$3,$4,$5)',
      [first_name, last_name, email, hashed, phone]
    );

    res.json({ message: 'User registered successfully' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        first_name: user.rows[0].first_name,
        last_name: user.rows[0].last_name,
        role: user.rows[0].role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await pool.query(
      "SELECT id, first_name, last_name, email, phone, role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ message: "First name and last name are required" });
    }

    await pool.query(
      "UPDATE users SET first_name=$1, last_name=$2, phone=$3 WHERE id=$4",
      [first_name, last_name, phone, userId]
    );

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await pool.query(
      "SELECT password FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(oldPassword, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: "Old password incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE id=$2",
      [hashed, userId]
    );

    res.json({ message: "Password changed successfully" });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ==================== BANKING OPERATIONS ====================

exports.deposit = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({ message: "Account ID and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query('BEGIN');

    // Verify account belongs to user
    const account = await client.query(
      "SELECT account_number FROM accounts WHERE id=$1 AND user_id=$2",
      [accountId, userId]
    );

    if (account.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Account not found" });
    }

    // Update balance
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [amount, accountId]
    );

    // Record transaction
    await client.query(
      "INSERT INTO transactions(sender_account, receiver_account, amount, status) VALUES($1,$2,$3,$4)",
      [account.rows[0].account_number, account.rows[0].account_number, amount, 'completed']
    );

    await client.query('COMMIT');

    res.json({ message: "Deposit successful" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Deposit error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.withdraw = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    if (!accountId || !amount) {
      return res.status(400).json({ message: "Account ID and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query('BEGIN');

    // Verify account and check balance
    const account = await client.query(
      "SELECT account_number, balance FROM accounts WHERE id=$1 AND user_id=$2",
      [accountId, userId]
    );

    if (account.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Account not found" });
    }

    if (account.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Update balance
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, accountId]
    );

    // Record transaction
    await client.query(
      "INSERT INTO transactions(sender_account, receiver_account, amount, status) VALUES($1,$2,$3,$4)",
      [account.rows[0].account_number, account.rows[0].account_number, amount, 'completed']
    );

    await client.query('COMMIT');

    res.json({ message: "Withdrawal successful" });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.transfer = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { fromAccount, toAccount, amount } = req.body;

    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query('BEGIN');

    // Verify source account belongs to user
    const source = await client.query(
      "SELECT account_number, balance FROM accounts WHERE id=$1 AND user_id=$2",
      [fromAccount, userId]
    );

    if (source.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Source account not found" });
    }

    if (source.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Verify destination account exists
    const destination = await client.query(
      "SELECT account_number FROM accounts WHERE id=$1",
      [toAccount]
    );

    if (destination.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Destination account not found" });
    }

    // Update balances
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, fromAccount]
    );

    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [amount, toAccount]
    );

    // Record transaction
    await client.query(
      "INSERT INTO transactions(sender_account, receiver_account, amount, status) VALUES($1,$2,$3,$4)",
      [source.rows[0].account_number, destination.rows[0].account_number, amount, 'completed']
    );

    await client.query('COMMIT');

    res.json({ 
      message: "Transfer successful",
      from: source.rows[0].account_number,
      to: destination.rows[0].account_number,
      amount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

exports.transactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get user's accounts
    const accounts = await pool.query(
      "SELECT account_number FROM accounts WHERE user_id=$1",
      [userId]
    );

    if (accounts.rows.length === 0) {
      return res.json([]);
    }

    // Get transactions involving user's accounts
    const accountNumbers = accounts.rows.map(a => a.account_number);
    
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE sender_account = ANY($1) OR receiver_account = ANY($1)
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [accountNumbers, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transactions 
       WHERE sender_account = ANY($1) OR receiver_account = ANY($1)`,
      [accountNumbers]
    );

    res.json({
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: err.message });
  }
};
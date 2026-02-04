const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { first_name, last_name, email, password, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
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
      return res.status(400).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        first_name: user.rows[0].first_name,
        last_name: user.rows[0].last_name
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
      "SELECT id, first_name, last_name, email, phone FROM users WHERE id=$1",
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

    await pool.query(
      "UPDATE users SET first_name=$1, last_name=$2, phone=$3 WHERE id=$4",
      [first_name, last_name, phone, userId]
    );

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const user = await pool.query(
      "SELECT password FROM users WHERE id=$1",
      [userId]
    );

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
    res.status(500).json({ error: err.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    await pool.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2 AND user_id=$3",
      [amount, accountId, userId]
    );

    await pool.query(
      "INSERT INTO transactions(user_id, account_id, type, amount, description) VALUES($1,$2,$3,$4,$5)",
      [userId, accountId, "deposit", amount, "Account deposit"]
    );

    res.json({ message: "Deposit successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    const account = await pool.query(
      "SELECT balance FROM accounts WHERE id=$1 AND user_id=$2",
      [accountId, userId]
    );

    if (account.rows[0].balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    await pool.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, accountId]
    );

    await pool.query(
      "INSERT INTO transactions(user_id, account_id, type, amount, description) VALUES($1,$2,$3,$4,$5)",
      [userId, accountId, "withdraw", amount, "Account withdrawal"]
    );

    res.json({ message: "Withdrawal successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transfer = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fromAccount, toAccount, amount } = req.body;

    const source = await pool.query(
      "SELECT balance FROM accounts WHERE id=$1 AND user_id=$2",
      [fromAccount, userId]
    );

    if (source.rows[0].balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    await pool.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, fromAccount]
    );

    await pool.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [amount, toAccount]
    );

    await pool.query(
      "INSERT INTO transactions(user_id, account_id, type, amount, description) VALUES($1,$2,$3,$4,$5)",
      [userId, fromAccount, "transfer", amount, "Transfer to another account"]
    );

    res.json({ message: "Transfer successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await pool.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC",
      [userId]
    );

    res.json(history.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const Joi = require('joi');

const depositSchema = Joi.object({
  accountId: Joi.number().required(),
  amount: Joi.number().positive().required()
});

express-rate-limit
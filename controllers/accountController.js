const pool = require('../config/db');

exports.transfer = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { fromAccount, toAccount, amount } = req.body;

    // Validate input
    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query('BEGIN');

    // Verify source account belongs to user
    const source = await client.query(
      "SELECT balance, account_number FROM accounts WHERE id=$1 AND user_id=$2",
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

    // Update source account balance
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, fromAccount]
    );

    // Update destination account balance
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
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get user's accounts first
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
       ORDER BY id DESC 
       LIMIT $2 OFFSET $3`,
      [accountNumbers, limit, offset]
    );

    res.json(result.rows);

  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: err.message });
  }
};
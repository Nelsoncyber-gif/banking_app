if (amount <= 0) {
  return res.status(400).json({ message: "Amount must be greater than zero" });
}

exports.transfer = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { fromAccount, toAccount, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query('BEGIN');

    const source = await client.query(
      "SELECT balance FROM accounts WHERE id=$1 AND user_id=$2",
      [fromAccount, userId]
    );

    if (source.rows.length === 0) {
      return res.status(404).json({ message: "Source account not found" });
    }

    if (source.rows[0].balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [amount, fromAccount]
    );

    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [amount, toAccount]
    );

    await client.query(
      "INSERT INTO transactions(user_id, account_id, type, amount, description) VALUES($1,$2,$3,$4,$5)",
      [userId, fromAccount, "transfer", amount, "Transfer to another account"]
    );

    await client.query('COMMIT');

    res.json({ message: "Transfer successful" });

  } catch (err) {
    await client.query('ROLLBACK');
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

    const result = await pool.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY id DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Initialize database schema
const initializeSchema = async () => {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create accounts table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          account_number VARCHAR(20) UNIQUE,
          balance DECIMAL(15, 2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create transactions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          sender_account VARCHAR(20),
          receiver_account VARCHAR(20),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if account_id column exists in transactions table, if not, add it
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'account_id'
    `);

    if (result.rows.length === 0) {
      // Add the account_id column if it doesn't exist
      await pool.query(`
        ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE;
      `);
    }

    // Check if other columns exist, add them if they don't
    const typeResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'type'
    `);

    if (typeResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN type VARCHAR(20);`);
    }

    const amountResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'amount'
    `);

    if (amountResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN amount DECIMAL(15, 2);`);
    }

    const senderResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'sender_account'
    `);

    if (senderResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN sender_account VARCHAR(20);`);
    }

    const receiverResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'receiver_account'
    `);

    if (receiverResult.rows.length === 0) {
      await pool.query(`ALTER TABLE transactions ADD COLUMN receiver_account VARCHAR(20);`);
    }

    // Create indexes if they don't exist
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);`);
    } catch (e) {
      console.log('Index idx_accounts_user_id may already exist');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);`);
    } catch (e) {
      console.log('Index idx_transactions_account_id may already exist');
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);`);
    } catch (e) {
      console.log('Index idx_transactions_created_at may already exist');
    }

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Error initializing database schema:', err);
  }
};

// Initialize schema and test connection
initializeSchema()
  .then(() => {
    pool.query('SELECT 1')
      .then(() => console.log('Connected to PostgreSQL database'))
      .catch(err => console.error('Database connection error:', err));
  })
  .catch(err => console.error('Schema initialization error:', err));

module.exports = pool;
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Simple connection test
pool.query('SELECT 1')
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Database connection error:', err));

module.exports = pool;
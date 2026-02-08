const pool = require('../config/db');

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Create a new bank account for the user
 */
exports.createAccount = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔵 Creating new account for user:', req.user.id);
    
    const userId = req.user.id;
    
    await client.query('BEGIN');

    // Generate unique account number
    const accountNumber = 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
    console.log('Generated account number:', accountNumber);

    // Insert new account
    const result = await client.query(
      `INSERT INTO accounts(user_id, account_number, balance) 
       VALUES($1, $2, 0) 
       RETURNING id, account_number, balance, created_at`,
      [userId, accountNumber]
    );

    await client.query('COMMIT');

    console.log('✅ Account created:', result.rows[0].id);
    
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      account: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Create account error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to create account"
    });
  } finally {
    client.release();
  }
};

/**
 * Get all accounts for the authenticated user
 */
exports.getAccounts = async (req, res) => {
  try {
    console.log('🔵 Getting accounts for user:', req.user.id);
    
    const userId = req.user.id;

    const accounts = await pool.query(
      `SELECT id, account_number, balance, created_at 
       FROM accounts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    console.log(`✅ Found ${accounts.rows.length} accounts`);
    
    res.json({
      success: true,
      accounts: accounts.rows,
      count: accounts.rows.length
    });

  } catch (err) {
    console.error('❌ Get accounts error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to retrieve accounts"
    });
  }
};

// ==================== DEPOSIT ====================

/**
 * Deposit money into an account
 */
exports.deposit = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔵 Deposit request:', req.body);
    
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    // Validation
    if (!accountId || !amount) {
      return res.status(400).json({ 
        success: false,
        message: "Account ID and amount are required" 
      });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid amount" 
      });
    }

    await client.query('BEGIN');

    // Verify account belongs to user
    const account = await client.query(
      `SELECT account_number, balance 
       FROM accounts 
       WHERE id=$1 AND user_id=$2`,
      [accountId, userId]
    );

    if (account.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Account not found:', accountId);
      return res.status(404).json({ 
        success: false,
        message: "Account not found" 
      });
    }

    console.log(`Depositing $${depositAmount} to account:`, account.rows[0].account_number);

    // Update balance
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [depositAmount, accountId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions(sender_account, receiver_account, amount, status, type) 
       VALUES($1, $2, $3, $4, $5)`,
      [
        account.rows[0].account_number, 
        account.rows[0].account_number, 
        depositAmount, 
        'completed',
        'deposit'
      ]
    );

    await client.query('COMMIT');

    console.log('✅ Deposit successful');
    
    res.json({ 
      success: true,
      message: "Deposit successful",
      amount: depositAmount.toFixed(2),
      newBalance: (account.rows[0].balance + depositAmount).toFixed(2)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Deposit error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Deposit failed"
    });
  } finally {
    client.release();
  }
};

// ==================== WITHDRAWAL ====================

/**
 * Withdraw money from an account
 */
exports.withdraw = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔵 Withdrawal request:', req.body);
    
    const userId = req.user.id;
    const { accountId, amount } = req.body;

    // Validation
    if (!accountId || !amount) {
      return res.status(400).json({ 
        success: false,
        message: "Account ID and amount are required" 
      });
    }

    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid amount" 
      });
    }

    await client.query('BEGIN');

    // Verify account and check balance
    const account = await client.query(
      `SELECT account_number, balance 
       FROM accounts 
       WHERE id=$1 AND user_id=$2`,
      [accountId, userId]
    );

    if (account.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Account not found:', accountId);
      return res.status(404).json({ 
        success: false,
        message: "Account not found" 
      });
    }

    const currentBalance = parseFloat(account.rows[0].balance);
    
    if (currentBalance < withdrawalAmount) {
      await client.query('ROLLBACK');
      console.log(`❌ Insufficient funds: ${currentBalance} < ${withdrawalAmount}`);
      return res.status(400).json({ 
        success: false,
        message: "Insufficient funds",
        currentBalance: currentBalance.toFixed(2)
      });
    }

    console.log(`Withdrawing $${withdrawalAmount} from account:`, account.rows[0].account_number);

    // Update balance
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [withdrawalAmount, accountId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions(sender_account, receiver_account, amount, status, type) 
       VALUES($1, $2, $3, $4, $5)`,
      [
        account.rows[0].account_number, 
        account.rows[0].account_number, 
        withdrawalAmount, 
        'completed',
        'withdrawal'
      ]
    );

    await client.query('COMMIT');

    console.log('✅ Withdrawal successful');
    
    res.json({ 
      success: true,
      message: "Withdrawal successful",
      amount: withdrawalAmount.toFixed(2),
      newBalance: (currentBalance - withdrawalAmount).toFixed(2)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Withdrawal error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Withdrawal failed"
    });
  } finally {
    client.release();
  }
};

// ==================== TRANSFER ====================

/**
 * Transfer money between accounts
 */
exports.transfer = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔵 Transfer request:', req.body);
    
    const userId = req.user.id;
    const { fromAccount, toAccount, amount } = req.body;

    // Validation
    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid amount" 
      });
    }

    // Check if fromAccount and toAccount are the same
    if (fromAccount === toAccount) {
      return res.status(400).json({ 
        success: false,
        message: "Cannot transfer to the same account" 
      });
    }

    await client.query('BEGIN');

    // Verify source account belongs to user
    const source = await client.query(
      `SELECT id, balance, account_number 
       FROM accounts 
       WHERE id=$1 AND user_id=$2`,
      [fromAccount, userId]
    );

    if (source.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Source account not found:', fromAccount);
      return res.status(404).json({ 
        success: false,
        message: "Source account not found" 
      });
    }

    const sourceBalance = parseFloat(source.rows[0].balance);
    
    if (sourceBalance < transferAmount) {
      await client.query('ROLLBACK');
      console.log(`❌ Insufficient funds: ${sourceBalance} < ${transferAmount}`);
      return res.status(400).json({ 
        success: false,
        message: "Insufficient funds",
        currentBalance: sourceBalance.toFixed(2)
      });
    }

    // Verify destination account exists
    const destination = await client.query(
      `SELECT id, account_number 
       FROM accounts 
       WHERE id=$1`,
      [toAccount]
    );

    if (destination.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Destination account not found:', toAccount);
      return res.status(404).json({ 
        success: false,
        message: "Destination account not found" 
      });
    }

    console.log(`Transferring $${transferAmount} from ${source.rows[0].account_number} to ${destination.rows[0].account_number}`);

    // Update source account balance
    await client.query(
      "UPDATE accounts SET balance = balance - $1 WHERE id=$2",
      [transferAmount, fromAccount]
    );

    // Update destination account balance
    await client.query(
      "UPDATE accounts SET balance = balance + $1 WHERE id=$2",
      [transferAmount, toAccount]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions(sender_account, receiver_account, amount, status, type) 
       VALUES($1, $2, $3, $4, $5)`,
      [
        source.rows[0].account_number, 
        destination.rows[0].account_number, 
        transferAmount, 
        'completed',
        'transfer'
      ]
    );

    await client.query('COMMIT');

    console.log('✅ Transfer successful');
    
    res.json({ 
      success: true,
      message: "Transfer successful",
      data: {
        from: source.rows[0].account_number,
        to: destination.rows[0].account_number,
        amount: transferAmount.toFixed(2)
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transfer error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Transfer failed"
    });
  } finally {
    client.release();
  }
};

// ==================== TRANSACTION HISTORY ====================

/**
 * Get transaction history for user's accounts
 */
exports.transactions = async (req, res) => {
  try {
    console.log('🔵 Getting transactions for user:', req.user.id);
    
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
      console.log('No accounts found for user');
      return res.json({
        success: true,
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Get account numbers for filtering
    const accountNumbers = accounts.rows.map(a => a.account_number);
    
    console.log(`Searching transactions for ${accountNumbers.length} accounts`);
    
    // Get transactions involving user's accounts
    const result = await pool.query(
      `SELECT id, sender_account, receiver_account, amount, status, type, created_at 
       FROM transactions 
       WHERE sender_account = ANY($1) OR receiver_account = ANY($1)
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [accountNumbers, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM transactions 
       WHERE sender_account = ANY($1) OR receiver_account = ANY($1)`,
      [accountNumbers]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    console.log(`✅ Found ${total} transactions, showing page ${page} of ${totalPages}`);
    
    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (err) {
    console.error('❌ Transactions error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to retrieve transactions"
    });
  }
};
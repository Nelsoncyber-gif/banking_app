const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ==================== AUTH CONTROLLERS ====================

exports.register = async (req, res) => {
  console.log('🔵 Register endpoint called');
  console.log('Request body:', req.body);
  
  const { first_name, last_name, email, password, phone } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !email || !password) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ 
      success: false,
      message: "Required fields: first name, last name, email, password" 
    });
  }

  try {
    console.log('📊 Checking if email exists:', email);
    
    // Check if user already exists
    const existing = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('❌ Email already registered:', email);
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    console.log('💾 Creating user in database...');
    // Create user
    const result = await pool.query(
      `INSERT INTO users(first_name, last_name, email, password, phone) 
       VALUES($1, $2, $3, $4, $5) 
       RETURNING id, first_name, last_name, email, phone, role, created_at`,
      [first_name, last_name, email, hashed, phone]
    );

    const newUser = result.rows[0];
    console.log('✅ User created:', newUser.id);

    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: "24h" }
    );

    console.log('✅ Registration successful for:', email);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Registration failed. Please try again."
    });
  }
};

exports.login = async (req, res) => {
  console.log('🔵 Login endpoint called');
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      message: "Email and password required" 
    });
  }

  try {
    console.log('📊 Finding user:', email);
    
    const user = await pool.query(
      'SELECT * FROM users WHERE email=$1',
      [email]
    );

    if (user.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    const dbUser = user.rows[0];
    console.log('🔐 Comparing password...');
    
    const valid = await bcrypt.compare(password, dbUser.password);

    if (!valid) {
      console.log('❌ Invalid password for:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: dbUser.id, role: dbUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: "24h" }
    );

    console.log('✅ Login successful for:', email);
    
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        role: dbUser.role
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.profile = async (req, res) => {
  try {
    console.log('🔵 Profile endpoint called for user:', req.user.id);
    
    const user = await pool.query(
      "SELECT id, first_name, last_name, email, phone, role FROM users WHERE id=$1",
      [req.user.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });
    
  } catch (err) {
    console.error('❌ Profile error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, phone } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required"
      });
    }

    let query, params;
    if (phone !== undefined && phone !== null) {
      // Update with phone
      query = "UPDATE users SET first_name=$1, last_name=$2, phone=$3 WHERE id=$4";
      params = [first_name, last_name, phone, userId];
    } else {
      // Update without phone (don't change existing phone value)
      query = "UPDATE users SET first_name=$1, last_name=$2 WHERE id=$3";
      params = [first_name, last_name, userId];
    }

    await pool.query(query, params);

    res.json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    console.log('🔵 Logout endpoint called for user:', req.user.id);

    // In a real implementation, you might want to blacklist the token
    // or perform other cleanup operations here

    res.json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both old and new passwords are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const user = await pool.query(
      "SELECT password FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const valid = await bcrypt.compare(oldPassword, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Old password incorrect"
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password=$1 WHERE id=$2",
      [hashed, userId]
    );

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


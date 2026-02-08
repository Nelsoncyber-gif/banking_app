require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const logger = require('./middleware/logger');
const pool = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/accountRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS (MUST be first for frontend access)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Security headers
app.use(helmet());

// Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom logger middleware
app.use(logger);

// ==================== DATABASE CONNECTION ====================

// Test database connection on startup
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Server will start but database operations will fail');
  });

// ==================== ROUTES ====================

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: '🏦 Banking API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// API routes - ALL routes imported BEFORE error handlers
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ==================== ERROR HANDLING ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER STARTUP ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log(`║  🚀 Banking API Server Started                           ║`);
  console.log(`║  🌐 Environment: ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log(`║  📡 Port: ${PORT}                                          ║`);
  console.log(`║  🔌 Database: ${process.env.DB_NAME || 'Not configured'}                     ║`);
  console.log(`║  ⏰ Time: ${new Date().toLocaleString()}                ║`);
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:3000`);
});

// Optional: Export app for testing
module.exports = app;
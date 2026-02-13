// Basic request logger
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
};

// Error logger
const errorLogger = (err, req, res, next) => {
  console.error(err.stack);
  next(err);
};

// Performance logger (logs slow requests)
const performanceLogger = (threshold = 2000) => {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > threshold) {
        console.warn(
          `Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`
        );
      }
    });

    next();
  };
};

// Audit logger (for logging specific actions)
const auditLogger = (action) => {
  return (req, res, next) => {
    console.log(`AUDIT: Action '${action}' performed by user ${req.user ? req.user.id : 'anonymous'} at ${new Date().toISOString()}`);
    next();
  };
};

module.exports = {
  logger,
  errorLogger,
  performanceLogger,
  auditLogger
};

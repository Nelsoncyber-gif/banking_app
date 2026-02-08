// middleware/validation.js - FIXED VERSION

const Joi = require('joi');

/**
 * Simple validation middleware for required fields
 * @param {Array} fields - Array of required field names
 * @returns {Function} Express middleware
 */
function validate(fields) {
  return (req, res, next) => {
    try {
      console.log('🔍 Validation checking fields:', fields);
      console.log('Request body:', req.body);

      for (let field of fields) {
        const value = req.body[field];

        // Check if field exists and is not empty
        if (value === undefined || value === null) {
          console.log(`❌ Validation failed: ${field} is missing`);
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }

        // Check for empty strings (after trimming whitespace)
        if (typeof value === 'string' && value.trim() === '') {
          console.log(`❌ Validation failed: ${field} is empty`);
          return res.status(400).json({
            success: false,
            message: `${field} cannot be empty`
          });
        }
      }

      console.log('✅ Validation passed for fields:', fields);
      next();

    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
}

// Optional: Joi validation for specific endpoints (if needed later)
const validateDeposit = (req, res, next) => {
  const schema = Joi.object({
    accountId: Joi.number().required(),
    amount: Joi.number().positive().required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  next();
};

// Export both functions - maintaining backward compatibility
module.exports = validate;  // Default export for existing imports
module.exports.validateDeposit = validateDeposit;  // Named export

// Also export as validate property for consistency
module.exports.validate = validate;l
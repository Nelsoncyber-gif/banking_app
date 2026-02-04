/**
 * Simple validation middleware for required fields
 * @param {Array} fields - Array of required field names
 * @returns {Function} Express middleware
 */
module.exports = function validate(fields) {
  return (req, res, next) => {
    try {
      for (let field of fields) {
        const value = req.body[field];
        
        // Check if field exists and is not empty
        if (value === undefined || value === null) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
        
        // Check for empty strings (after trimming whitespace)
        if (typeof value === 'string' && value.trim() === '') {
          return res.status(400).json({
            success: false,
            message: `${field} cannot be empty`
          });
        }
      }
      
      next();
      
    } catch (err) {
      console.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};
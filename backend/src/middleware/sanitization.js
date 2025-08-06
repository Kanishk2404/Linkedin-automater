const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');
const logger = require('../utils/logger');

/**
 * Sanitize HTML content to prevent XSS attacks
 */
const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target']
  });
};

/**
 * Sanitize plain text input
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return validator.escape(text.trim());
};

/**
 * Validate and sanitize email
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  return validator.isEmail(trimmed) ? trimmed : '';
};

/**
 * Validate and sanitize URL
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  return validator.isURL(trimmed) ? trimmed : '';
};

/**
 * Sanitize object properties recursively
 */
const sanitizeObject = (obj, rules = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const rule = rules[key] || 'text';
    
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeByRule(item, rule) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, rules[key] || {});
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeByRule(value, rule);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Apply sanitization based on rule type
 */
const sanitizeByRule = (value, rule) => {
  switch (rule) {
    case 'html':
      return sanitizeHtml(value);
    case 'email':
      return sanitizeEmail(value);
    case 'url':
      return sanitizeUrl(value);
    case 'text':
    default:
      return sanitizeText(value);
  }
};

/**
 * Middleware for sanitizing request body
 */
const sanitizeBody = (rules = {}) => {
  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, rules);
        logger.debug('Request body sanitized', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.userId
        });
      }
      next();
    } catch (error) {
      logger.error('Input sanitization error', {
        error: error.message,
        endpoint: req.originalUrl,
        method: req.method
      });
      res.status(500).json({
        success: false,
        message: 'Input processing error'
      });
    }
  };
};

/**
 * Middleware for sanitizing query parameters
 */
const sanitizeQuery = (rules = {}) => {
  return (req, res, next) => {
    try {
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, rules);
        logger.debug('Query parameters sanitized', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.userId
        });
      }
      next();
    } catch (error) {
      logger.error('Query sanitization error', {
        error: error.message,
        endpoint: req.originalUrl,
        method: req.method
      });
      res.status(500).json({
        success: false,
        message: 'Query processing error'
      });
    }
  };
};

/**
 * Validate required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    // Handle case where req.body might be undefined (e.g., before multer parsing)
    if (!req.body) {
      req.body = {};
    }
    
    const missing = [];
    
    for (const field of fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      logger.warn('Validation failed - missing required fields', {
        missing,
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.userId
      });
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Validate field lengths
 */
const validateLength = (rules) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, { min, max }] of Object.entries(rules)) {
      const value = req.body[field];
      if (value && typeof value === 'string') {
        if (min && value.length < min) {
          errors.push(`${field} must be at least ${min} characters`);
        }
        if (max && value.length > max) {
          errors.push(`${field} must be no more than ${max} characters`);
        }
      }
    }
    
    if (errors.length > 0) {
      logger.warn('Validation failed - length constraints', {
        errors,
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.userId
      });
      
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }
    
    next();
  };
};

module.exports = {
  sanitizeHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  validateRequired,
  validateLength
};

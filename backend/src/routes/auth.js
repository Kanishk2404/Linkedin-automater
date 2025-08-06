const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validation = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const { authLimiter, authStatusLimiter } = require('../middleware/rateLimiting');
const { sanitizeBody, validateRequired, validateLength } = require('../middleware/sanitization');

// User registration
router.post('/signup', 
  authLimiter, // Apply strict rate limiting to signup
  sanitizeBody({ 
    email: 'email', 
    username: 'text', 
    password: 'text' 
  }),
  validateRequired(['email', 'username', 'password']),
  validateLength({
    username: { min: 3, max: 50 },
    password: { min: 6, max: 100 }
  }),
  validation.validateRegistration.bind(validation), 
  authController.signup
);

// User login
router.post('/login', 
  authLimiter, // Apply strict rate limiting to login
  sanitizeBody({ 
    email: 'email', 
    password: 'text' 
  }),
  validateRequired(['email', 'password']),
  validation.validateLogin.bind(validation), 
  authController.login
);

// Get current user - use more lenient rate limiting
router.get('/me', authStatusLimiter, verifyToken, authController.getCurrentUser);

// Logout
router.post('/logout', authLimiter, verifyToken, authController.logout);

// Password reset request
router.post('/request-password-reset', 
  authLimiter, // Apply strict rate limiting to password reset
  sanitizeBody({ email: 'email' }),
  validateRequired(['email']),
  authController.requestPasswordReset
);

// Reset password with code
router.post('/reset-password', 
  authLimiter, // Apply strict rate limiting to password reset
  sanitizeBody({ 
    email: 'email',
    resetCode: 'text',
    newPassword: 'text'
  }),
  validateRequired(['email', 'resetCode', 'newPassword']),
  validateLength({
    newPassword: { min: 6, max: 100 },
    resetCode: { min: 6, max: 6 }
  }),
  authController.resetPassword
);

module.exports = router; 
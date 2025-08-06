
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Per-user AI rate limiting for users with their own keys
const userAiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // Limit each user to 100 AI requests per day
  keyGenerator: (req) => {
    // Use user ID if available, else fallback to IP (IPv6 safe)
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    // Use express-rate-limit's ipKeyGenerator for IPv6 compatibility
    const { ipKeyGenerator } = require('express-rate-limit');
    return ipKeyGenerator(req);
  },
  skip: (req) => {
    // Only apply this limiter if useOwnKeys is true
    return !req.body.useOwnKeys;
  },
  message: {
    success: false,
    message: 'You have reached your daily limit of 100 AI generations with your own API keys.'
  },
  handler: (req, res) => {
    logger.warn('User AI rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'You have reached your daily limit of 100 AI generations with your own API keys.'
    });
  }
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per windowMs (increased from 10)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    });
  }
});

// More lenient rate limiting for auth status checks
const authStatusLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 status checks per 5 minutes
  message: {
    success: false,
    message: 'Too many authentication status checks, please try again later.'
  },
  handler: (req, res) => {
    logger.warn('Auth status rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication status checks, please try again later.'
    });
  }
});

// Rate limiting for AI content generation
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 AI requests per minute
  message: {
    success: false,
    message: 'Too many AI generation requests, please try again later.'
  },
  handler: (req, res) => {
    logger.warn('AI rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many AI generation requests, please try again later.'
    });
  }
});

// Per-user rate limiting for posting
const createPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each user to 50 posts per hour
  // Remove custom keyGenerator to use default IP handling
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Post creation rate limit exceeded', {
      userId: req.user?.userId,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Too many posts created, please try again later.'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  authStatusLimiter,
  aiLimiter,
  createPostLimiter,
  userAiLimiter
};

const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthMiddleware {
  // Verify JWT token
  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }

      // Add user info to request
      req.user = {
        id: user.id,
        userId: user.id, // Keep both for compatibility
        email: user.email,
        username: user.username
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  }

  // Optional token verification (for public routes that can work with or without auth)
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without user
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);
      
      if (!token) {
        req.user = null;
        return next();
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        req.user = null;
        return next();
      }

      // Add user info to request
      req.user = {
        userId: user.id,
        email: user.email,
        username: user.username
      };

      next();
    } catch (error) {
      // Token verification failed, continue without user
      req.user = null;
      next();
    }
  }

  // Check if user is verified
  requireVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // For now, all users are auto-verified
    // In the future, you can add verification logic here
    next();
  }

  // Rate limiting middleware (basic implementation)
  rateLimit(limit = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();

    return (req, res, next) => {
      const key = req.user ? req.user.userId : req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old requests
      if (requests.has(key)) {
        requests.set(key, requests.get(key).filter(time => time > windowStart));
      } else {
        requests.set(key, []);
      }

      const userRequests = requests.get(key);

      if (userRequests.length >= limit) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      }

      userRequests.push(now);
      next();
    };
  }
}

module.exports = new AuthMiddleware(); 
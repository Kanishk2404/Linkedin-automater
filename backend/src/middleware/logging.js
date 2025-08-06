const logger = require('../utils/logger');

// Middleware to log API requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function(body) {
    const duration = Date.now() - start;
    const userId = req.user?.userId || null;
    const statusCode = res.statusCode;
    
    // Log the request
    logger.apiRequest(req.method, req.originalUrl, userId, duration);
    
    // Log additional info for important endpoints
    if (req.originalUrl.includes('/auth/')) {
      logger.auth(
        req.originalUrl.split('/').pop(), 
        userId, 
        statusCode < 400
      );
    }
    
    if (req.originalUrl.includes('/posts/') && req.method === 'POST') {
      logger.info('Post creation attempt', {
        userId,
        endpoint: req.originalUrl,
        success: statusCode < 400,
        duration
      });
    }

    // Call original send
    originalSend.call(this, body);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  const userId = req.user?.userId || null;
  
  logger.error('Request error', err, {
    method: req.method,
    url: req.originalUrl,
    userId,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};

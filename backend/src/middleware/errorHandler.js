class ErrorHandler {
  // Global error handler
  handleError(err, req, res, next) {
    console.error('Error:', err);

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let error = err.message;

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation error';
      error = err.message;
    } else if (err.name === 'SequelizeValidationError') {
      statusCode = 400;
      message = 'Database validation error';
      error = err.message;
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      statusCode = 409;
      message = 'Resource already exists';
      error = 'Duplicate entry';
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      message = 'Invalid reference';
      error = 'Referenced resource not found';
    } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
      error = 'Token verification failed';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
      error = 'Please login again';
    } else if (err.code === 'ENOTFOUND') {
      statusCode = 503;
      message = 'Service unavailable';
      error = 'External service is down';
    } else if (err.code === 'ECONNRESET') {
      statusCode = 503;
      message = 'Connection error';
      error = 'Network connection failed';
    } else if (err.code === 'ETIMEDOUT') {
      statusCode = 408;
      message = 'Request timeout';
      error = 'Request took too long to complete';
    }

    // Send error response
    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'production' ? 'Internal error' : error,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }

  // 404 handler
  handleNotFound(req, res, next) {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      error: `Cannot ${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
  }

  // Async error wrapper
  wrapAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Custom error class
  createError(statusCode, message, details = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  // Handle specific API errors
  handleAPIError(err, req, res, next) {
    // Handle LinkedIn API errors
    if (err.code === 'LINKEDIN_API_ERROR') {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn API error',
        error: err.message,
        details: err.details
      });
    }

    // Handle AI service errors
    if (err.code === 'AI_SERVICE_ERROR') {
      return res.status(503).json({
        success: false,
        message: 'AI service error',
        error: err.message,
        details: err.details
      });
    }

    // Handle rate limiting errors
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        error: 'Too many requests, please try again later',
        retryAfter: err.retryAfter
      });
    }

    // Handle validation errors
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: err.message,
        details: err.details
      });
    }

    // Handle authentication errors
    if (err.code === 'AUTHENTICATION_ERROR') {
      return res.status(401).json({
        success: false,
        message: 'Authentication error',
        error: err.message
      });
    }

    // Handle authorization errors
    if (err.code === 'AUTHORIZATION_ERROR') {
      return res.status(403).json({
        success: false,
        message: 'Authorization error',
        error: err.message
      });
    }

    // Default error handling
    next(err);
  }

  // Log error with context
  logError(err, req) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    };

    console.error('Error Log:', JSON.stringify(errorLog, null, 2));
  }
}

module.exports = new ErrorHandler(); 
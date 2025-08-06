require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

// Check required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', null, { missingEnvVars });
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('💡 Please check your .env file and ensure all required variables are set');
  console.error('📝 See .env.example for reference');
  process.exit(1);
}

// Import the new modular structure
const { handleError, handleNotFound } = require('./src/middleware/errorHandler');
const { requestLogger, errorLogger } = require('./src/middleware/logging');
const { apiLimiter } = require('./src/middleware/rateLimiting');
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const scheduleRoutes = require('./src/routes/schedule');
const aiRoutes = require('./src/routes/ai');
const systemRoutes = require('./src/routes/system');
const { syncModels } = require('./src/models');
const scheduleController = require('./src/controllers/scheduleController');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.linkedin.com", "https://api.openai.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Dynamic CORS middleware for development
app.use(cors({
  origin: (origin, callback) => {
    // In production, use specific URLs
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://yourdomain.com'
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow any localhost origin
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));

// Apply body parsing middleware AFTER checking content type
// Skip JSON parsing entirely for file upload routes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply JSON parsing conditionally based on Content-Type header
app.use((req, res, next) => {
  const contentType = req.get('content-type') || '';
  
  console.log('🔍 Content-Type check:', {
    path: req.path,
    method: req.method,
    contentType: contentType,
    isMultipart: contentType.includes('multipart/form-data'),
    isJson: contentType.includes('application/json')
  });
  
  // Only apply JSON parser if content-type is application/json AND not multipart
  if (contentType.includes('application/json') && !contentType.includes('multipart')) {
    console.log('📝 Applying JSON parser for:', req.path);
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    console.log('📝 Skipping JSON parser for content-type:', contentType, 'path:', req.path);
    next();
  }
});

// Request logging middleware
app.use(requestLogger);

// Rate limiting
const { userAiLimiter } = require('./src/middleware/rateLimiting');
app.use('/api/posts/generate', userAiLimiter);
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/system', systemRoutes);

// Legacy route compatibility (for existing frontend) - redirect to new routes
app.use('/generate-post', (req, res, next) => {
  req.url = req.url.replace('/generate-post', '/api/posts/generate');
  postRoutes(req, res, next);
});
app.use('/post-to-linkedin', (req, res, next) => {
  req.url = req.url.replace('/post-to-linkedin', '/api/posts/post');
  postRoutes(req, res, next);
});
app.use('/generate-image', (req, res, next) => {
  req.url = req.url.replace('/generate-image', '/api/ai/generate-image');
  aiRoutes(req, res, next);
});
app.use('/schedule-post', (req, res, next) => {
  req.url = req.url.replace('/schedule-post', '/api/schedule/post');
  scheduleRoutes(req, res, next);
});
app.use('/get-scheduled-posts', (req, res, next) => {
  req.url = req.url.replace('/get-scheduled-posts', '/api/schedule/posts');
  scheduleRoutes(req, res, next);
});
app.use('/delete-scheduled-post', (req, res, next) => {
  req.url = req.url.replace('/delete-scheduled-post', '/api/schedule/delete');
  scheduleRoutes(req, res, next);
});
app.use('/schedule-bulk-posts', (req, res, next) => {
  req.url = req.url.replace('/schedule-bulk-posts', '/api/schedule/bulk');
  scheduleRoutes(req, res, next);
});
app.use('/get-post-history', (req, res, next) => {
  req.url = req.url.replace('/get-post-history', '/api/posts/history');
  postRoutes(req, res, next);
});
app.use('/delete-post', (req, res, next) => {
  req.url = req.url.replace('/delete-post', '/api/posts');
  postRoutes(req, res, next);
});

// 404 handler
app.use(handleNotFound);

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(handleError);

// Initialize database and start server
const startScheduler = () => {
  // Background scheduler: checks every 30s for due scheduled posts
  setInterval(async () => {
    try {
      await scheduleController.executeScheduledPosts();
    } catch (error) {
      console.error('Scheduler error:', error);
    }
  }, 30000);
};

const startServer = async () => {
  try {
    // Sync database models
    await syncModels();
    logger.info('Database models synchronized successfully');
    console.log('✅ Database models synchronized');

    // Start background scheduler
    startScheduler();
    logger.info('Background scheduler started');
    console.log('✅ Background scheduler started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, { port: PORT, nodeEnv: process.env.NODE_ENV });
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

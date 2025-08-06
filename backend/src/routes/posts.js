const express = require('express');
const router = express.Router();
const multer = require('multer');
const postController = require('../controllers/postController');
const validation = require('../middleware/validation');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { createPostLimiter } = require('../middleware/rateLimiting');
const { sanitizeBody, validateRequired, validateLength } = require('../middleware/sanitization');

// Configure multer for image uploads
const upload = multer({ 
  dest: 'uploads/', 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for LinkedIn
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// LinkedIn OAuth routes (OAuth URL requires authentication, callback does not)
router.get('/linkedin/status', verifyToken, postController.checkLinkedInConnection);
router.get('/oauth/url', verifyToken, postController.getOAuthURL);
router.get('/oauth/callback', postController.handleOAuthCallback);

// AI content generation routes
router.post('/generate', 
  optionalAuth,
  sanitizeBody({ 
    prompt: 'text',
    tone: 'text',
    length: 'text',
    includeHashtags: 'text',
    includeEmojis: 'text'
  }),
  validateRequired(['prompt']),
  validateLength({
    prompt: { min: 10, max: 1000 }
  }),
  validation.validateAIPrompt.bind(validation), 
  validation.validateAIKeys.bind(validation), 
  postController.generatePost
);

// LinkedIn posting routes
router.post('/post', 
  createPostLimiter,
  optionalAuth, 
  upload.array('images', 9), // This will handle both FormData and JSON
  (req, res, next) => {
    // Debug middleware to log request body and files
    console.log('🔍 DEBUG - Request Body and Files:', {
      bodyKeys: Object.keys(req.body || {}),
      body: req.body,
      filesCount: req.files?.length || 0,
      files: req.files?.map(f => ({ originalname: f.originalname, size: f.size })) || [],
      contentType: req.get('Content-Type'),
      hasContent: !!req.body?.content,
      contentLength: req.body?.content?.length || 0
    });
    next();
  },
  sanitizeBody({ 
    content: 'text',
    linkedinAccessToken: 'text',
    imageUrls: 'text',
    articleUrl: 'text',
    companyPageId: 'text',
    postType: 'text'
  }),
  validateRequired(['content']),
  validateLength({
    content: { min: 1, max: 3000 }
  }),
  validation.validatePostContent.bind(validation), 
  validation.validateImageUpload.bind(validation), 
  postController.postToLinkedIn
);

// Post management routes
router.get('/history', optionalAuth, postController.getPostHistory);
router.delete('/:id', optionalAuth, postController.deletePost);

module.exports = router; 
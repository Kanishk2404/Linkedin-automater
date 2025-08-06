const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const validation = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');
const { createPostLimiter } = require('../middleware/rateLimiting');
const { sanitizeBody, sanitizeQuery, validateRequired, validateLength } = require('../middleware/sanitization');

// Schedule a LinkedIn post
router.post('/post', 
  createPostLimiter,
  verifyToken,
  sanitizeBody({ 
    content: 'text',
    scheduledTime: 'text',
    linkedinAccessToken: 'text'
  }),
  validateRequired(['content', 'scheduledTime']),
  validateLength({
    content: { min: 1, max: 3000 }
  }),
  validation.validatePostContent.bind(validation), 
  validation.validateScheduling.bind(validation), 
  scheduleController.schedulePost
);

// Get scheduled posts
router.get('/posts', 
  verifyToken,
  sanitizeQuery({ 
    page: 'text',
    limit: 'text'
  }),
  scheduleController.getScheduledPosts
);

// Delete scheduled post
router.delete('/posts/:id', 
  verifyToken, 
  scheduleController.deleteScheduledPost
);

// Bulk schedule posts
router.post('/bulk', 
  verifyToken, 
  validation.validateBulkScheduling.bind(validation), 
  scheduleController.bulkSchedulePosts
);

module.exports = router; 
const express = require('express');
const router = express.Router();
const { generateImage } = require('../services/aiService');
const validation = require('../middleware/validation');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiting');
const { sanitizeBody, validateRequired, validateLength } = require('../middleware/sanitization');

// Apply AI rate limiting to all AI routes
router.use(aiLimiter);

// Generate AI image
router.post('/generate-image', 
  optionalAuth,
  sanitizeBody({ 
    prompt: 'text',
    useOwnKeys: 'text',
    openaiApiKey: 'text'
  }),
  validateRequired(['prompt']),
  validateLength({
    prompt: { min: 5, max: 500 }
  }),
  validation.validateAIPrompt.bind(validation), 
  validation.validateAIKeys.bind(validation), 
  async (req, res) => {
    try {
      const { prompt, useOwnKeys, openaiApiKey } = req.body;
      const userId = req.user.userId;

      const result = await generateImage({
        prompt,
        useOwnKeys,
        openaiApiKey,
        userId
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Generate image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate image',
        error: error.message
      });
    }
  }
);

// Bulk generate LinkedIn posts
router.post('/bulk-generate', 
  optionalAuth, 
  validation.validateAIPrompt.bind(validation), 
  validation.validateAIKeys.bind(validation), 
  async (req, res) => {
    try {
      const { prompts, useOwnKeys, perplexityApiKey, openaiApiKey, geminiApiKey, aiProviders } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(prompts) || prompts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No prompts provided'
        });
      }

      if (prompts.length > 25) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 25 prompts allowed'
        });
      }

      const results = [];
      const { generatePost } = require('../services/aiService');

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        let generatedPost = '';
        let error = null;

        try {
          const result = await generatePost({
            prompt,
            useOwnKeys,
            perplexityApiKey,
            openaiApiKey,
            geminiApiKey,
            aiProviders,
            userId
          });

          if (result) {
            generatedPost = result;
          } else {
            error = 'No post generated';
          }
        } catch (err) {
          error = err.message;
        }

        // Sanitize and check length
        const cleanPost = generatedPost ? generatedPost.replace(/^[\["']|["']]$/g, '') : '';
        if (cleanPost.length > 3000) {
          results.push({ prompt, post: '', error: 'Generated post exceeds 3000 characters' });
        } else if (!cleanPost) {
          results.push({ prompt, post: '', error: error || 'No post generated' });
        } else {
          results.push({ prompt, post: cleanPost, error: null });
        }
      }

      res.json({
        success: true,
        results
      });
    } catch (error) {
      console.error('Bulk generate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate bulk posts',
        error: error.message
      });
    }
  }
);

module.exports = router; 
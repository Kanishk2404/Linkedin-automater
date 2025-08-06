class ValidationMiddleware {
  // Validate post content (LinkedIn)
  validatePostContent(req, res, next) {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Post content is required'
      });
    }

    if (content.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Post content exceeds 3000 characters'
      });
    }

    // Sanitize content
    req.body.content = this.sanitizeInput(content);
    next();
  }

  // Validate AI prompt
  validateAIPrompt(req, res, next) {
    const { aiPrompt } = req.body;
    
    if (aiPrompt && typeof aiPrompt !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'AI prompt must be a string'
      });
    }

    if (aiPrompt) {
      req.body.aiPrompt = this.sanitizeInput(aiPrompt);
    }
    next();
  }

  // Validate AI API keys
  validateAIKeys(req, res, next) {
    const { useOwnKeys, perplexityApiKey, openaiApiKey, geminiApiKey } = req.body;
    
    console.log('AI Keys validation:', {
      useOwnKeys,
      hasPerplexityKey: !!perplexityApiKey,
      hasOpenAIKey: !!openaiApiKey,
      hasGeminiKey: !!geminiApiKey,
      builtInPerplexity: !!process.env.PERPLEXITY_API_KEY,
      builtInOpenAI: !!process.env.OPENAI_API_KEY,
      builtInGemini: !!process.env.GEMINI_API_KEY
    });
    
    if (useOwnKeys) {
      // Validate at least one AI key is provided
      const hasValidKey = (perplexityApiKey && this.isValidPerplexityKey(perplexityApiKey)) ||
                         (openaiApiKey && this.isValidOpenAIKey(openaiApiKey)) ||
                         (geminiApiKey && this.isValidGeminiKey(geminiApiKey));

      if (!hasValidKey) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid AI API key is required when using own keys'
        });
      }
    } else {
      // Check if we have built-in keys available
      const hasBuiltInKeys = (process.env.PERPLEXITY_API_KEY && this.isValidPerplexityKey(process.env.PERPLEXITY_API_KEY)) ||
                            (process.env.OPENAI_API_KEY && this.isValidOpenAIKey(process.env.OPENAI_API_KEY)) ||
                            (process.env.GEMINI_API_KEY && this.isValidGeminiKey(process.env.GEMINI_API_KEY));
      
      console.log('Built-in keys validation:', {
        hasBuiltInKeys,
        perplexityValid: process.env.PERPLEXITY_API_KEY && this.isValidPerplexityKey(process.env.PERPLEXITY_API_KEY),
        openaiValid: process.env.OPENAI_API_KEY && this.isValidOpenAIKey(process.env.OPENAI_API_KEY),
        geminiValid: process.env.GEMINI_API_KEY && this.isValidGeminiKey(process.env.GEMINI_API_KEY)
      });
      
      if (!hasBuiltInKeys) {
        return res.status(400).json({
          success: false,
          message: 'No built-in AI API keys available. Please use your own keys.'
        });
      }
    }

    next();
  }

  // Validate scheduling parameters
  validateScheduling(req, res, next) {
    const { scheduledTime, userTimeZone } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time is required'
      });
    }

    // Validate date format
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled time format'
      });
    }

    // Check if scheduled time is in the future
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    next();
  }

  // Validate bulk scheduling parameters
  validateBulkScheduling(req, res, next) {
    const { posts, startDate, postsPerDay } = req.body;
    
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Posts array is required and cannot be empty'
      });
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date is required'
      });
    }

    if (!postsPerDay || postsPerDay < 1 || postsPerDay > 10) {
      return res.status(400).json({
        success: false,
        message: 'Posts per day must be between 1 and 10'
      });
    }

    // Validate start date
    const startDateTime = new Date(startDate);
    if (isNaN(startDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (startDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }

    // Validate each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      if (!post.content || typeof post.content !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Post #${i + 1} content is required`
        });
      }
      if (post.content.length > 3000) {
        return res.status(400).json({
          success: false,
          message: `Post #${i + 1} exceeds 3000 characters`
        });
      }
    }

    next();
  }

  // Validate user registration
  validateRegistration(req, res, next) {
    const { username, email, password } = req.body;
    
    if (!username || typeof username !== 'string' || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    if (!email || !this.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Sanitize inputs
    req.body.username = this.sanitizeInput(username);
    req.body.email = email.toLowerCase().trim();
    
    next();
  }

  // Validate user login
  validateLogin(req, res, next) {
    const { email, password } = req.body;
    
    if (!email || !this.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    req.body.email = email.toLowerCase().trim();
    next();
  }

  // Sanitize input
  sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<script.*?>.*?<\/script>/gi, '').replace(/[<>]/g, '').trim();
  }

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate Perplexity API key format
  isValidPerplexityKey(key) {
    return key && typeof key === 'string' && key.startsWith('pplx-') && key.length > 20;
  }

  // Validate OpenAI API key format
  isValidOpenAIKey(key) {
    return key && typeof key === 'string' && key.startsWith('sk-') && key.length > 20;
  }

  // Validate Gemini API key format
  isValidGeminiKey(key) {
    return key && typeof key === 'string' && key.startsWith('AIza') && key.length > 20;
  }

  // Validate image upload
  validateImageUpload(req, res, next) {
    // Handle both single file and multiple files
    const files = req.files || (req.file ? [req.file] : []);
    
    if (files.length === 0) {
      return next(); // No files uploaded, continue
    }

    // Check each file
    for (const file of files) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Only JPEG, PNG, and GIF images are allowed'
        });
      }

      // Check file size (10MB limit for LinkedIn)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Image size must be less than 10MB'
        });
      }
    }

    next();
  }
}

module.exports = new ValidationMiddleware(); 
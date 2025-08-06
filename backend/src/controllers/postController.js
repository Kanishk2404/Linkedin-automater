const { Post, ScheduledPost } = require('../models');
const aiService = require('../services/aiService');
const linkedinService = require('../services/linkedinService');
const { encrypt, decrypt } = require('../services/encryptionService');

class PostController {
  // Generate LinkedIn post content using AI
  async generatePost(req, res, next) {
    try {
      const { prompt, userName, aiProviders, useOwnKeys, perplexityApiKey, openaiApiKey, geminiApiKey } = req.body;
      const userId = req.user?.id || req.body.userId || null;

      console.log('Generate post request received:', {
        prompt: prompt ? 'PROVIDED' : 'MISSING',
        userName: userName ? 'PROVIDED' : 'MISSING',
        useOwnKeys,
        aiProviders,
        hasPerplexityKey: perplexityApiKey ? 'YES' : 'NO',
        hasOpenaiKey: openaiApiKey ? 'YES' : 'NO',
        hasGeminiKey: geminiApiKey ? 'YES' : 'NO'
      });

      if (!prompt) {
        console.log('Error: AI prompt is required');
        return res.status(400).json({ success: false, message: 'AI prompt is required' });
      }

      console.log('Calling aiService.generatePost...');
      const result = await aiService.generatePost({
        prompt: prompt,
        useOwnKeys,
        perplexityApiKey,
        openaiApiKey,
        geminiApiKey,
        aiProviders,
        userId
      });

      console.log('AI service returned result:', result ? 'SUCCESS' : 'EMPTY');
      
      // Handle both old format (string) and new format (object with metadata)
      if (typeof result === 'string') {
        // Legacy format - return as before
        res.json({ success: true, content: result });
      } else if (result && result.content) {
        // New format with metadata - include provider info
        res.json({ 
          success: true, 
          content: result.content,
          metadata: result.metadata
        });
      } else {
        throw new Error('Invalid AI service response format');
      }
    } catch (error) {
      console.error('Post generation error:', error);
      console.error('Error stack:', error.stack);
      next(error);
    }
  }

  // Post to LinkedIn
  async postToLinkedIn(req, res) {
    try {
      const { content, imageUrls, articleUrl, postType, companyPageId, linkedinAccessToken } = req.body;
      const uploadedFiles = req.files || []; // Files uploaded via multer
      
      // Handle imageUrls array from different sources (JSON vs FormData)
      let processedImageUrls = [];
      if (Array.isArray(imageUrls)) {
        // From JSON request
        processedImageUrls = imageUrls.filter(url => url && url.trim());
      } else if (imageUrls) {
        // Single URL from FormData
        processedImageUrls = [imageUrls].filter(url => url && url.trim());
      } else {
        // Check for FormData format: imageUrls[0], imageUrls[1], etc.
        const imageUrlKeys = Object.keys(req.body).filter(key => key.startsWith('imageUrls['));
        processedImageUrls = imageUrlKeys.map(key => req.body[key]).filter(url => url && url.trim());
      }

      console.log('LinkedIn post request received:', {
        hasContent: !!content,
        contentLength: content ? content.length : 0,
        hasToken: !!linkedinAccessToken,
        tokenLength: linkedinAccessToken ? linkedinAccessToken.length : 0,
        hasImages: processedImageUrls.length > 0,
        imageUrlCount: processedImageUrls.length,
        hasUploadedFiles: uploadedFiles.length > 0,
        uploadedFileCount: uploadedFiles.length,
        uploadedFileDetails: uploadedFiles.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })),
        hasArticle: !!articleUrl,
        postType,
        companyPageId: companyPageId || 'personal',
        userId: req.user?.id,
        requestType: uploadedFiles.length > 0 ? 'FormData' : 'JSON'
      });

      if (!content) {
        console.log('❌ Post content is missing');
        return res.status(400).json({ success: false, message: 'Post content is required' });
      }

      if (!linkedinAccessToken) {
        console.log('❌ LinkedIn access token is missing');
        return res.status(400).json({ success: false, message: 'LinkedIn access token is required' });
      }

      // Validate the LinkedIn token by trying to get user profile
      console.log('🔍 Validating LinkedIn access token...');
      try {
        const profile = await linkedinService.getUserProfile(linkedinAccessToken);
        console.log('✅ LinkedIn token validated for user:', profile.name);
        
        // Save/update LinkedIn connection in database for future reference
        if (req.user?.id) {
          try {
            const { User } = require('../models');
            const user = await User.findByPk(req.user.id);
            if (user && (!user.linkedinConnected || !user.linkedinAccessToken)) {
              await user.update({
                linkedinAccessToken: linkedinAccessToken,
                linkedinProfile: JSON.stringify(profile),
                linkedinConnected: true
              });
              console.log('📝 Updated LinkedIn connection in database for user:', req.user.id);
            }
          } catch (dbError) {
            console.log('⚠️ Failed to update database, but continuing with post:', dbError.message);
          }
        }
      } catch (tokenError) {
        console.error('❌ LinkedIn token validation failed:', tokenError.message);
        return res.status(401).json({ 
          success: false, 
          message: 'LinkedIn access token is invalid or expired. Please reconnect your LinkedIn account.' 
        });
      }

      console.log('🚀 Attempting to create LinkedIn post...');
      
      // Create post on LinkedIn
      const linkedinPost = await linkedinService.createPost(linkedinAccessToken, {
        content,
        imageUrls: processedImageUrls, // Use processed imageUrls array
        uploadedFiles, // Pass uploaded files to LinkedIn service
        articleUrl,
        postType,
        companyPageId
      });

      console.log('✅ LinkedIn post created successfully:', linkedinPost.id);

      // Save to database
      const post = await Post.create({
        userId: req.user?.id || 1,
        content,
        imageUrls: processedImageUrls.length > 0 ? JSON.stringify(processedImageUrls) : null,
        articleUrl: articleUrl || null,
        linkedinId: linkedinPost.id,
        platform: 'linkedin',
        postType: postType || 'text',
        companyPageId: companyPageId || null
      });

      console.log('✅ Post saved to database with ID:', post.id);

      res.json({
        success: true,
        message: 'Post created successfully on LinkedIn',
        postId: linkedinPost.id,
        localPostId: post.id
      });
    } catch (error) {
      console.error('❌ LinkedIn post error:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Failed to post to LinkedIn';
      
      // Check for specific LinkedIn API errors
      if (error.response?.data) {
        const linkedInError = error.response.data;
        if (linkedInError.message) {
          errorMessage = `LinkedIn API Error: ${linkedInError.message}`;
        } else if (linkedInError.error_description) {
          errorMessage = `LinkedIn OAuth Error: ${linkedInError.error_description}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ success: false, message: errorMessage });
    }
  }

  // Get post history
  async getPostHistory(req, res) {
    try {
      const { linkedinAccessToken } = req.query;

      const posts = await Post.findAll({
        where: { platform: 'linkedin' },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      // If we have access token, get analytics
      if (linkedinAccessToken) {
        for (const post of posts) {
          if (post.linkedinId) {
            try {
              const analytics = await linkedinService.getPostAnalytics(linkedinAccessToken, post.linkedinId);
              post.engagement = analytics;
            } catch (error) {
              console.error('Analytics error:', error);
            }
          }
        }
      }

      res.json({ success: true, posts });
    } catch (error) {
      console.error('Post history error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Delete post from LinkedIn
  async deletePost(req, res) {
    try {
      const { id } = req.params;
      const { linkedinAccessToken } = req.body;

      const post = await Post.findByPk(id);
      if (!post) {
        return res.status(404).json({ success: false, message: 'Post not found' });
      }

      // Delete from LinkedIn if we have access token
      if (linkedinAccessToken && post.linkedinId) {
        try {
          await linkedinService.deletePost(linkedinAccessToken, post.linkedinId);
        } catch (error) {
          console.error('LinkedIn delete error:', error);
          // Continue with local deletion even if LinkedIn deletion fails
        }
      }

      // Delete from local database
      await post.destroy();

      res.json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Check LinkedIn connection status
  async checkLinkedInConnection(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }

      console.log('🔍 Checking LinkedIn connection for user:', userId);

      const { User } = require('../models');
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check database first
      let isConnected = user.linkedinConnected || false;
      let profile = null;
      let accessToken = null;
      
      if (isConnected && user.linkedinProfile) {
        try {
          profile = JSON.parse(user.linkedinProfile);
          accessToken = user.linkedinAccessToken;
          console.log('✅ Found LinkedIn connection in database');
        } catch (error) {
          console.log('⚠️ Error parsing LinkedIn profile from database:', error.message);
          isConnected = false;
        }
      }

      // If not connected in database, check if we have valid tokens in the request headers
      // This handles cases where tokens are stored in localStorage but not yet in database
      if (!isConnected) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          // For now, we'll rely on the frontend to send us the connection status
          // The frontend should handle localStorage persistence
          console.log('ℹ️ No LinkedIn connection found in database, relying on frontend state');
        }
      }

      console.log('LinkedIn connection status:', {
        connected: isConnected,
        hasProfile: !!profile,
        hasToken: !!accessToken,
        tokenExpiry: user.linkedinTokenExpiry
      });

      res.json({ 
        success: true, 
        connected: isConnected,
        profile: profile ? {
          name: profile.name || `${profile.firstName} ${profile.lastName}`,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          headline: profile.headline,
          profilePicture: profile.profilePicture
        } : null,
        // Include access token for frontend localStorage sync (user's own token)
        accessToken: isConnected ? accessToken : null,
        tokenExpiry: user.linkedinTokenExpiry
      });
    } catch (error) {
      console.error('❌ Check LinkedIn connection error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get LinkedIn OAuth URL
  async getOAuthURL(req, res) {
    try {
      console.log('🔗 Generating LinkedIn OAuth URL...');
      
      // Get user ID from authenticated request
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        console.log('❌ User not authenticated. req.user:', req.user);
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }
      
      console.log('✅ User authenticated with ID:', userId);
      // Generate OAuth URL with user context
      const oauthUrl = linkedinService.getOAuthURL(userId);
      console.log('✅ OAuth URL generated:', oauthUrl);
      res.json({ success: true, oauthUrl });
    } catch (error) {
      console.error('❌ OAuth URL error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Handle LinkedIn OAuth callback
  async handleOAuthCallback(req, res) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({ success: false, message: 'Authorization code is required' });
      }

      // Decode user ID from state parameter
      let userId = null;
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = stateData.userId;
      } catch (error) {
        console.log('⚠️  Could not decode user ID from state parameter');
      }

       const tokenData = await linkedinService.exchangeCodeForToken(code);
      
      // Get user profile
      const profile = await linkedinService.getUserProfile(tokenData.accessToken);
      
      // Try to get company pages, but don't fail if we don't have permission
      let companyPages = [];
      try {
        companyPages = await linkedinService.getCompanyPages(tokenData.accessToken);
      } catch (error) {
        console.log('📝 Company pages not available (permissions needed):', error.message);
        companyPages = []; // Continue without company pages
      }
      
      console.log('✅ LinkedIn OAuth Success:', {
        profile: profile.name || 'Profile retrieved',
        tokenReceived: !!tokenData.accessToken,
        expiresIn: tokenData.expiresIn,
        userId: userId
      });

      // Save LinkedIn credentials to user account if we have user context
      if (userId) {
        try {
          const { User } = require('../models');
          const user = await User.findByPk(userId);
          
          if (user) {
            // Calculate token expiry date
            const expiryDate = new Date();
            expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expiresIn);
            
            // Update user with LinkedIn connection
            await user.update({
              linkedinAccessToken: tokenData.accessToken,
              linkedinRefreshToken: tokenData.refreshToken || null,
              linkedinProfile: JSON.stringify(profile),
              linkedinTokenExpiry: expiryDate,
              linkedinConnected: true
            });
            
            console.log('✅ LinkedIn connection saved to user account:', user.email);
          } else {
            console.log('⚠️  User not found for ID:', userId);
          }
        } catch (error) {
          console.error('❌ Failed to save LinkedIn connection:', error.message);
        }
      } else {
        console.log('⚠️  No user context - LinkedIn tokens not saved to database');
      }
      
      // Render HTML page that posts message to parent window
      // Use CSP-compliant approach with better token handling
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Authentication Complete</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline';">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container { 
              background: rgba(255,255,255,0.1); 
              padding: 40px; 
              border-radius: 10px; 
              max-width: 500px; 
              margin: 0 auto; 
            }
            .success { color: #28a745; font-size: 24px; }
            .processing { color: #ffffff; margin: 20px 0; }
            .profile-info { 
              background: rgba(255,255,255,0.2); 
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0; 
            }
            .close-message {
              background: rgba(255,255,255,0.2);
              padding: 15px;
              border-radius: 8px;
        const tokenData = await linkedinService.exchangeCodeForToken(code);
              font-size: 14px;
            }
            .debug-info {
              background: rgba(0,0,0,0.3);
              padding: 10px;
              border-radius: 5px;
              margin: 10px 0;
              font-family: monospace;
              font-size: 12px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">✅ LinkedIn Connected Successfully!</h2>
            <p class="processing">Connection completed!</p>
            
            <div class="profile-info">
              <p><strong>Profile:</strong> ${profile.name}</p>
              <p><strong>Email:</strong> ${profile.email}</p>
            </div>
            
            <div class="debug-info">
              <strong>Debug Info:</strong><br>
              Access Token: ${tokenData.accessToken ? tokenData.accessToken.substring(0, 20) + '...' : 'MISSING'}<br>
              Refresh Token: ${tokenData.refreshToken ? 'Present' : 'MISSING'}<br>
              Profile: ${profile ? 'Present' : 'MISSING'}
            </div>
            
            <div class="close-message">
              <p>✅ <strong>Success!</strong> Your LinkedIn account has been connected.</p>
              <p>This popup will close automatically in 3 seconds...</p>
              <button onclick="window.close()" style="
                background: #28a745; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                margin-top: 10px;
              ">Close Window</button>
            </div>
          </div>
          
          <script>
            (function() {
              console.log('🔗 LinkedIn OAuth callback executing...');
              
              // Prepare message data with detailed logging
              const messageData = {
                type: 'LINKEDIN_OAUTH_SUCCESS',
                profile: ${JSON.stringify(profile)},
                companyPages: [],
                accessToken: '${tokenData.accessToken || ''}',
                refreshToken: '${tokenData.refreshToken || ''}'
              };
              
              console.log('📊 OAuth callback data prepared:', {
                type: messageData.type,
                hasProfile: !!messageData.profile,
                hasAccessToken: !!messageData.accessToken,
                accessTokenLength: messageData.accessToken ? messageData.accessToken.length : 0,
                hasRefreshToken: !!messageData.refreshToken,
                refreshTokenLength: messageData.refreshToken ? messageData.refreshToken.length : 0
              });
              
              // Post success message to parent window immediately
              function sendMessageToParent() {
                console.log('🚀 Attempting to send message to parent window...');
                
                if (window.opener && !window.opener.closed) {
                  console.log('✅ Parent window found, sending message...');
                  
                  try {
                    const targetOrigin = '${process.env.FRONTEND_URL || 'http://localhost:5173'}';
                    console.log('🎯 Sending to origin:', targetOrigin);
                    
                    window.opener.postMessage(messageData, targetOrigin);
                    console.log('✅ Message sent successfully to parent window');
                    
                    // Verify message was sent by logging it again
                    console.log('📋 Final message data sent:', messageData);
                    
                    // Close popup after successful message
                    setTimeout(function() {
                      console.log('🔒 Closing popup window...');
                      window.close();
                    }, 3000); // Increased to 3 seconds for better UX
                    
                  } catch (error) {
                    console.error('❌ Error sending message to parent:', error);
                    
                    // Try alternative approach
                    setTimeout(function() {
                      console.log('🔄 Falling back to redirect...');
                      window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:5173'}/?linkedin_connected=true';
                    }, 3000);
                  }
                } else {
                  console.log('❌ No parent window found, redirecting...');
                  setTimeout(function() {
                    window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:5173'}/?linkedin_connected=true';
                  }, 3000);
                }
              }
              
              // Execute immediately and also on load for better compatibility
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', sendMessageToParent);
              } else {
                sendMessageToParent();
              }
              
              // Also try on window load as backup
              window.addEventListener('load', function() {
                console.log('🔄 Window loaded, trying to send message again...');
                setTimeout(sendMessageToParent, 500); // Small delay to ensure everything is ready
              });
              
            })();
          </script>
        </body>
        </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>OAuth Error</h1>
          <p>${error.message}</p>
          <script>
            setTimeout(() => {
              window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:5173'}';
            }, 3000);
          </script>
        </body>
        </html>
      `);
    }
  }
}

module.exports = new PostController(); 
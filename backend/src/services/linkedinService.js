const axios = require('axios');
const { encrypt, decrypt } = require('./encryptionService');

class LinkedInService {
  constructor() {
    this.baseURL = 'https://api.linkedin.com/v2';
    this.oauthURL = 'https://www.linkedin.com/oauth/v2';
    this.openidURL = 'https://www.linkedin.com/oauth/v2';
  }

  // LinkedIn OAuth Configuration
  getOAuthConfig() {
    return {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/posts/oauth/callback',
      // Try combining OpenID Connect with posting permissions
      scope: 'openid profile email w_member_social'
    };
  }

  // Generate OAuth URL with user context
  getOAuthURL(userId = null) {
    const config = this.getOAuthConfig();
    console.log('🔧 LinkedIn OAuth Config:', {
      clientId: config.clientId ? 'SET' : 'MISSING',
      clientSecret: config.clientSecret ? 'SET' : 'MISSING',
      redirectUri: config.redirectUri,
      scope: config.scope
    });
    
    if (!config.clientId || !config.clientSecret) {
      throw new Error('LinkedIn OAuth configuration is incomplete. Please check LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.');
    }
    
    // Include user ID in state parameter for callback identification
    const stateData = {
      random: Math.random().toString(36).substring(7),
      userId: userId
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state: state
    });
    
    const authUrl = `${this.oauthURL}/authorization?${params.toString()}`;
    console.log('🔗 Generated LinkedIn OAuth URL:', authUrl);
    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, state = null) {
    try {
      const config = this.getOAuthConfig();
      console.log('🔄 Exchanging authorization code for access token...');
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret
      });

      const response = await axios.post(`${this.oauthURL}/accessToken`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Access token received:', {
        tokenLength: response.data.access_token ? response.data.access_token.length : 0,
        expiresIn: response.data.expires_in,
        scope: response.data.scope
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        scope: response.data.scope,
        refreshToken: response.data.refresh_token,
        state: state
      };
    } catch (error) {
      console.error('❌ LinkedIn token exchange failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  // Get user profile using OpenID Connect
  async getUserProfile(accessToken) {
    try {
      console.log('🔍 Fetching LinkedIn user profile...');
      
      // First try OpenID Connect userinfo endpoint
      try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log('✅ OpenID profile retrieved:', {
          sub: response.data.sub,
          name: response.data.name,
          email: response.data.email,
          picture: response.data.picture ? 'PRESENT' : 'MISSING'
        });
        
        return response.data;
      } catch (openidError) {
        console.log('⚠️ OpenID Connect failed, trying legacy profile API:', openidError.message);
        
        // Fallback to legacy profile API
        const response = await axios.get(`${this.baseURL}/people/~:(id,firstName,lastName,emailAddress,profilePicture(displayImage~:playableStreams))`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });

        const profile = response.data;
        console.log('✅ Legacy profile retrieved:', {
          id: profile.id,
          firstName: profile.firstName?.localized?.en_US,
          lastName: profile.lastName?.localized?.en_US
        });

        // Convert to OpenID format for consistency
        return {
          sub: profile.id,
          name: `${profile.firstName?.localized?.en_US || ''} ${profile.lastName?.localized?.en_US || ''}`.trim(),
          given_name: profile.firstName?.localized?.en_US,
          family_name: profile.lastName?.localized?.en_US,
          email: profile.emailAddress,
          picture: profile.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier
        };
      }
    } catch (error) {
      console.error('❌ LinkedIn profile fetch failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  // Create LinkedIn post
  async createPost(accessToken, postData) {
    try {
      const { content, imageUrls, uploadedFiles, articleUrl, postType, companyPageId } = postData;
      
      console.log('🔧 LinkedIn createPost called with:', {
        hasAccessToken: !!accessToken,
        tokenLength: accessToken ? accessToken.length : 0,
        contentLength: content ? content.length : 0,
        hasImages: !!(imageUrls && imageUrls.length > 0),
        hasUploadedFiles: !!(uploadedFiles && uploadedFiles.length > 0),
        uploadedFileCount: uploadedFiles ? uploadedFiles.length : 0,
        hasArticle: !!articleUrl,
        postType,
        companyPageId
      });

      // Get user profile to get the correct ID format
      const profile = await this.getUserProfile(accessToken);
      let authorId;
      
      if (companyPageId) {
        authorId = `urn:li:organization:${companyPageId}`;
        console.log('📄 Posting as company page:', authorId);
      } else {
        // Use the sub field from OpenID Connect profile (this is the LinkedIn user ID)
        authorId = `urn:li:person:${profile.sub}`;
        console.log('👤 Posting as personal profile:', authorId, 'from profile sub:', profile.sub);
      }
      
      // Create the post payload using LinkedIn's current API format
      // Start with a simple text post structure
      let postPayload = {
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Handle different post types with proper LinkedIn API integration
      if ((imageUrls && imageUrls.length > 0) || (uploadedFiles && uploadedFiles.length > 0)) {
        const totalImages = (imageUrls ? imageUrls.length : 0) + (uploadedFiles ? uploadedFiles.length : 0);
        console.log('🖼️ Post contains images:', {
          imageUrls: imageUrls ? imageUrls.length : 0,
          uploadedFiles: uploadedFiles ? uploadedFiles.length : 0,
          total: totalImages
        });
        
        // Upload images and get media URNs
        const mediaUrns = await this.uploadAllImages(accessToken, profile.sub, imageUrls, uploadedFiles);
        
        if (mediaUrns.length > 0) {
          console.log('✅ Images uploaded successfully:', mediaUrns.length);
          // Update post payload for image post
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrns.map(urn => ({
            status: 'READY',
            description: {
              text: 'Image'
            },
            media: urn,
            title: {
              text: 'Image'
            }
          }));
        } else {
          console.log('⚠️ No images uploaded successfully, posting as text only');
        }
      } else if (articleUrl && articleUrl.trim()) {
        console.log('📰 Adding article to post (currently disabled for debugging):', articleUrl);
        // Temporarily disable article posts to focus on text posts first
        console.log('⚠️ Article posts temporarily disabled for debugging. Posting as text only.');
      } else {
        console.log('📝 Creating text-only post');
      }

      // Ensure we always use NONE for shareMediaCategory initially
      if (!postPayload.specificContent['com.linkedin.ugc.ShareContent'].media) {
        postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'NONE';
      }

      console.log('📤 Sending LinkedIn API request with payload:', JSON.stringify(postPayload, null, 2));

      const response = await axios.post(`${this.baseURL}/ugcPosts`, postPayload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ LinkedIn API response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ LinkedIn post creation error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        requestPayload: error.config?.data ? JSON.parse(error.config.data) : 'N/A'
      });
      
      // Provide more specific error messages based on LinkedIn API response
      if (error.response?.status === 401) {
        throw new Error('LinkedIn access token is invalid or expired. Please reconnect your LinkedIn account.');
      } else if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to post on LinkedIn. Please check your LinkedIn app permissions.');
      } else if (error.response?.status === 422) {
        // Enhanced error message for 422 errors
        const linkedInErrorDetail = error.response?.data?.message || 'Post format validation failed';
        console.error('❌ LinkedIn 422 Error Details:', {
          message: linkedInErrorDetail,
          serviceErrorCode: error.response?.data?.serviceErrorCode,
          status: error.response?.data?.status
        });
        throw new Error(`Invalid post content format: ${linkedInErrorDetail}. Please check your post content and try again.`);
      } else if (error.response?.data?.message) {
        throw new Error(`LinkedIn API Error: ${error.response.data.message}`);
      } else {
        throw new Error(`Failed to create LinkedIn post: ${error.message}`);
      }
    }
  }

  // Upload all images (both URLs and files) to LinkedIn
  async uploadAllImages(accessToken, personId, imageUrls = [], uploadedFiles = []) {
    const mediaUrns = [];
    
    try {
      // Upload images from URLs
      if (imageUrls && imageUrls.length > 0) {
        console.log('📤 Uploading images from URLs:', imageUrls.length);
        for (const imageUrl of imageUrls) {
          try {
            const mediaUrn = await this.uploadImageFromUrl(accessToken, personId, imageUrl);
            if (mediaUrn) {
              mediaUrns.push(mediaUrn);
            }
          } catch (error) {
            console.error('❌ Failed to upload image from URL:', imageUrl, error.message);
          }
        }
      }
      
      // Upload uploaded files
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('📤 Uploading local files:', uploadedFiles.length);
        for (const file of uploadedFiles) {
          try {
            const mediaUrn = await this.uploadImageFile(accessToken, personId, file);
            if (mediaUrn) {
              mediaUrns.push(mediaUrn);
            }
          } catch (error) {
            console.error('❌ Failed to upload local file:', file.originalname, error.message);
          }
        }
      }
      
      console.log('✅ Total images uploaded successfully:', mediaUrns.length);
      return mediaUrns;
    } catch (error) {
      console.error('❌ Image upload process failed:', error.message);
      return [];
    }
  }
  
  // Upload image from URL
  async uploadImageFromUrl(accessToken, personId, imageUrl) {
    try {
      console.log('📥 Downloading image from URL:', imageUrl);
      
      // Download image
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
      
      console.log('✅ Image downloaded:', {
        size: imageBuffer.length,
        contentType: contentType
      });
      
      return await this.uploadImageBuffer(accessToken, personId, imageBuffer, contentType);
    } catch (error) {
      console.error('❌ Failed to download/upload image from URL:', error.message);
      return null;
    }
  }
  
  // Upload local image file
  async uploadImageFile(accessToken, personId, file) {
    try {
      console.log('📁 Uploading local file:', {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
      
      // Read file buffer
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(file.path);
      
      return await this.uploadImageBuffer(accessToken, personId, imageBuffer, file.mimetype);
    } catch (error) {
      console.error('❌ Failed to upload local file:', error.message);
      return null;
    }
  }
  
  // Core image upload function
  async uploadImageBuffer(accessToken, personId, imageBuffer, contentType) {
    try {
      // Step 1: Register upload
      console.log('🔄 Step 1: Registering image upload with LinkedIn...');
      
      const registerPayload = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${personId}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      };
      
      const registerResponse = await axios.post(`${this.baseURL}/assets?action=registerUpload`, registerPayload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const uploadInstructions = registerResponse.data.value;
      const asset = uploadInstructions.asset;
      const uploadUrl = uploadInstructions.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      
      console.log('✅ Upload registered:', {
        asset: asset,
        uploadUrl: uploadUrl ? 'PROVIDED' : 'MISSING'
      });
      
      // Step 2: Upload image binary
      console.log('🔄 Step 2: Uploading image binary...');
      
      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          'Content-Type': contentType,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      
      console.log('✅ Image binary uploaded successfully');
      
      // Step 3: Wait for processing and return URN
      console.log('🔄 Step 3: Image processing complete, returning URN:', asset);
      return asset;
      
    } catch (error) {
      console.error('❌ Image upload failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  // Get user ID from access token
  async getUserId(accessToken) {
    try {
      const profile = await this.getUserProfile(accessToken);
      // OpenID Connect uses 'sub' field for user ID
      const userId = profile.sub || profile.id;
      console.log('🆔 Retrieved user ID:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Failed to get user ID:', error.message);
      throw new Error('Failed to get user ID');
    }
  }

  // Get company pages for user
  async getCompanyPages(accessToken) {
    try {
      const response = await axios.get(`${this.baseURL}/organizationalEntityAcls?q=roleAssignee`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return response.data.elements;
    } catch (error) {
      console.error('LinkedIn company pages error:', error.response?.data || error.message);
      return [];
    }
  }

  // Get post analytics
  async getPostAnalytics(accessToken, postId) {
    try {
      const response = await axios.get(`${this.baseURL}/socialMetrics/${postId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return response.data;
    } catch (error) {
      console.error('LinkedIn analytics error:', error.response?.data || error.message);
      return null;
    }
  }

  // Delete a post from LinkedIn
  async deletePost(accessToken, postId) {
    try {
      console.log('🗑️ Deleting LinkedIn post:', { postId: postId ? 'PROVIDED' : 'MISSING' });

      if (!postId) {
        throw new Error('Post ID is required for deletion');
      }

      // LinkedIn API endpoint to delete a post
      const deleteURL = `${this.baseURL}/posts/${encodeURIComponent(postId)}`;
      
      const response = await axios.delete(deleteURL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202407'
        }
      });

      console.log('✅ LinkedIn post deleted successfully:', {
        postId,
        status: response.status
      });

      return { success: true, postId };
    } catch (error) {
      console.error('❌ LinkedIn delete post error:', {
        postId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      // LinkedIn API might return 404 if post was already deleted or doesn't exist
      if (error.response?.status === 404) {
        console.log('⚠️ Post not found on LinkedIn (may have been already deleted)');
        return { success: true, postId, note: 'Post not found (may have been already deleted)' };
      }

      throw error;
    }
  }
}

module.exports = new LinkedInService();

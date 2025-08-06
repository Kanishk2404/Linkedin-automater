const { ScheduledPost } = require('../models');
const linkedinService = require('../services/linkedinService');
const { encrypt, decrypt } = require('../services/encryptionService');

class ScheduleController {
  // Schedule a single LinkedIn post
  async schedulePost(req, res) {
    try {
      const { content, scheduledTime, linkedinAccessToken, companyPageId, articleUrl, imageUrls } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, message: 'Post content is required' });
      }

      if (content.length > 3000) {
        return res.status(400).json({ success: false, message: 'Post content exceeds 3000 characters' });
      }

      if (!scheduledTime) {
        return res.status(400).json({ success: false, message: 'Scheduled time is required' });
      }

      if (!linkedinAccessToken) {
        return res.status(400).json({ success: false, message: 'LinkedIn access token is required' });
      }

      const scheduledDate = new Date(scheduledTime);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled time must be in the future' });
      }

      if (!req.body.linkedinRefreshToken) {
        console.warn('⚠️ LinkedIn refresh token is missing for scheduled post. Token may expire and fail to post.');
      }
      const scheduledPost = await ScheduledPost.create({
        userId: req.user?.id || 1,
        content,
        scheduledTime: scheduledDate,
        status: 'pending',
        linkedinAccessToken: encrypt(linkedinAccessToken),
        linkedinRefreshToken: encrypt(req.body.linkedinRefreshToken || ''),
        companyPageId: companyPageId || null,
        articleUrl: articleUrl || null,
        imageUrls: imageUrls || null,
        platform: 'linkedin',
        // Only allow valid enum values for postType
        postType: (imageUrls && imageUrls.length > 0) ? 'image' : (articleUrl ? 'article' : 'text')
      });

      res.json({
        success: true,
        message: 'Post scheduled successfully',
        scheduledPost
      });
    } catch (error) {
      console.error('Schedule post error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get scheduled posts
  async getScheduledPosts(req, res) {
    try {
      const scheduledPosts = await ScheduledPost.findAll({
        where: { platform: 'linkedin' },
        order: [['scheduledTime', 'ASC']]
      });

      res.json({ success: true, scheduledPosts });
    } catch (error) {
      console.error('Get scheduled posts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Delete scheduled post
  async deleteScheduledPost(req, res) {
    try {
      const { id } = req.params;

      const scheduledPost = await ScheduledPost.findOne({
        where: { id, platform: 'linkedin' }
      });

      if (!scheduledPost) {
        return res.status(404).json({ success: false, message: 'Scheduled post not found' });
      }

      await scheduledPost.destroy();

      res.json({ success: true, message: 'Scheduled post deleted successfully' });
    } catch (error) {
      console.error('Delete scheduled post error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Bulk schedule LinkedIn posts
  async bulkSchedulePosts(req, res) {
    try {
      const { posts, startDate, postsPerDay, linkedinAccessToken, linkedinRefreshToken, companyPageId } = req.body;

      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        return res.status(400).json({ success: false, message: 'Posts array is required' });
      }

      if (!startDate) {
        return res.status(400).json({ success: false, message: 'Start date is required' });
      }

      if (!linkedinAccessToken) {
        return res.status(400).json({ success: false, message: 'LinkedIn access token is required' });
      }

      const startDateTime = new Date(startDate);
      if (startDateTime <= new Date()) {
        return res.status(400).json({ success: false, message: 'Start date must be in the future' });
      }

      let currentDate = startDateTime;
      let scheduledCount = 0;

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        
        if (!post.content || post.content.length > 3000) {
          continue; // Skip invalid posts
        }

        // Calculate scheduled time based on posts per day
        const dayOffset = Math.floor(i / postsPerDay);
        const timeSlot = i % postsPerDay;
        
        // Distribute posts throughout the day (e.g., 8 AM, 2 PM, 6 PM)
        const timeSlots = [8, 14, 18]; // 8 AM, 2 PM, 6 PM
        const hour = timeSlots[timeSlot % timeSlots.length];
        
        const scheduledDate = new Date(currentDate);
        scheduledDate.setHours(hour, 0, 0, 0);
        
        // Add day offset
        scheduledDate.setDate(scheduledDate.getDate() + dayOffset);

        if (scheduledDate > new Date()) {
          const existing = await ScheduledPost.findOne({
            where: {
              content: post.content,
              scheduledTime: scheduledDate,
              platform: 'linkedin'
            }
          });

          if (!existing) {
            await ScheduledPost.create({
              userId: req.user?.id || 1,
              content: post.content,
              scheduledTime: scheduledDate,
              status: 'pending',
              linkedinAccessToken: encrypt(linkedinAccessToken),
              linkedinRefreshToken: encrypt(linkedinRefreshToken || ''),
              companyPageId: companyPageId || null,
              articleUrl: post.articleUrl || null,
              imageUrls: post.imageUrls || null,
              platform: 'linkedin',
              postType: companyPageId ? 'company' : 'personal'
            });
            scheduledCount++;
          }
        }
      }

      res.json({
        success: true,
        message: `Scheduled ${scheduledCount} posts`
      });
    } catch (error) {
      console.error('Bulk schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to schedule bulk posts',
        error: error.message
      });
    }
  }

  // Execute scheduled posts (called by background scheduler)
  async executeScheduledPosts() {
    try {
      const now = new Date();
      const duePosts = await ScheduledPost.findAll({
        where: {
          status: 'pending',
          scheduledTime: { [require('sequelize').Op.lte]: now },
          platform: 'linkedin'
        }
      });

      for (const scheduledPost of duePosts) {
        try {
          const accessToken = decrypt(scheduledPost.linkedinAccessToken);
          
          // Post to LinkedIn
          const linkedinPost = await linkedinService.createPost(accessToken, {
            content: scheduledPost.content,
            imageUrls: scheduledPost.imageUrls,
            articleUrl: scheduledPost.articleUrl,
            postType: scheduledPost.postType,
            companyPageId: scheduledPost.companyPageId
          });

          // Update status
          scheduledPost.status = 'posted';
          scheduledPost.linkedinId = linkedinPost.id;
          await scheduledPost.save();

          console.log(`Scheduled post posted successfully: ${linkedinPost.id}`);
        } catch (error) {
          // Log full error details for debugging
          console.error('Error posting scheduled post:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status,
            statusText: error.response?.statusText
          });
          scheduledPost.status = 'failed';
          scheduledPost.errorMessage = error.message + (error.response?.data ? ` | LinkedIn response: ${JSON.stringify(error.response.data)}` : '');
          await scheduledPost.save();
        }
      }
    } catch (error) {
      console.error('Execute scheduled posts error:', error);
    }
  }
}

module.exports = new ScheduleController(); 
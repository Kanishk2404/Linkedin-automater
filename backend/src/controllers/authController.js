const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const emailService = require('../services/emailService');

class AuthController {
  // User registration
  async signup(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        username,
        email,
        passwordHash,
        verified: true // Auto-verify for now
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  }

  // User login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: ['id', 'username', 'email', 'verified']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user',
        error: error.message
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Password reset request
  async requestPasswordReset(req, res) {
    try {
      console.log('Password reset request received:', req.body);
      const { email } = req.body;

      // Find user by email
      console.log('Looking for user with email:', email);
      const user = await User.findOne({ where: { email } });
      console.log('User found:', !!user);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If the email exists, a reset code has been sent.'
        });
      }

      // Generate a 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      console.log('Generated reset code:', resetCode);

      // Save reset code to user
      await user.update({
        resetCode,
        resetCodeExpiry
      });

      console.log('Reset code saved to database');

      // Send email with reset code
      const emailResult = await emailService.sendPasswordResetEmail(email, resetCode);
      
      if (emailResult.success) {
        console.log(`✅ Password reset email sent to ${email}`);
      } else {
        console.log(`⚠️ Email sending failed, showing code in console for development:`);
        console.log(`Password reset code for ${email}: ${resetCode}`);
      }

      res.json({
        success: true,
        message: 'Password reset code sent to your email',
        // Remove this in production - only for development
        resetCode: process.env.NODE_ENV === 'development' && !emailResult.success ? resetCode : undefined
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  // Verify reset code and reset password
  async resetPassword(req, res) {
    try {
      const { email, resetCode, newPassword } = req.body;

      // Find user with valid reset code
      const user = await User.findOne({
        where: {
          email,
          resetCode,
          resetCodeExpiry: {
            [require('sequelize').Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset code'
        });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset code
      await user.update({
        passwordHash,
        resetCode: null,
        resetCodeExpiry: null
      });

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }
}

module.exports = new AuthController(); 
const { DataTypes } = require('sequelize');
const sequelize = require('../../db');

// User Model (keep as is - works for both platforms)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetCodeExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // LinkedIn integration fields
  linkedinAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  linkedinRefreshToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  linkedinProfile: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  linkedinTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  linkedinConnected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// LinkedIn Post Model (converted from Tweet)
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT, // LinkedIn allows up to 3000 characters
    allowNull: false
  },
  imageUrls: {
    type: DataTypes.JSON, // Array of image URLs (LinkedIn supports multiple images)
    allowNull: true
  },
  articleUrl: {
    type: DataTypes.STRING, // For article link posts
    allowNull: true
  },
  linkedinId: {
    type: DataTypes.STRING, // LinkedIn post ID
    allowNull: true,
    unique: true
  },
  platform: {
    type: DataTypes.ENUM('linkedin', 'twitter', 'wordpress'),
    defaultValue: 'linkedin'
  },
  postType: {
    type: DataTypes.ENUM('text', 'image', 'article', 'carousel'),
    defaultValue: 'text'
  },
  companyPageId: {
    type: DataTypes.STRING, // For company page posts
    allowNull: true
  },
  engagement: {
    type: DataTypes.JSON, // Store likes, comments, shares
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Scheduled LinkedIn Post Model (converted from ScheduledTweet)
const ScheduledPost = sequelize.define('ScheduledPost', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageUrls: {
    type: DataTypes.JSON,
    allowNull: true
  },
  articleUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'posted', 'failed'),
    defaultValue: 'pending'
  },
  linkedinAccessToken: {
    type: DataTypes.TEXT, // LinkedIn OAuth access token
    allowNull: true
  },
  linkedinRefreshToken: {
    type: DataTypes.TEXT, // LinkedIn OAuth refresh token
    allowNull: true
  },
  postedPostId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  platform: {
    type: DataTypes.ENUM('linkedin', 'twitter', 'wordpress'),
    defaultValue: 'linkedin'
  },
  postType: {
    type: DataTypes.ENUM('text', 'image', 'article', 'carousel'),
    defaultValue: 'text'
  },
  companyPageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Define relationships
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ScheduledPost, { foreignKey: 'userId', as: 'scheduledPosts' });
ScheduledPost.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Sync models with database
const syncModels = async () => {
  try {
    // For fresh Railway database, we can use force: true to create tables
    // In production, you might want to use migrations instead
    await sequelize.sync({ force: false });
    
    // Add missing columns for password reset functionality
    try {
      // Check if resetCode column exists, if not add it
      await sequelize.getQueryInterface().describeTable('Users')
        .then(async (tableDefinition) => {
          if (!tableDefinition.resetCode) {
            console.log('Adding resetCode column to Users table...');
            await sequelize.getQueryInterface().addColumn('Users', 'resetCode', {
              type: DataTypes.STRING,
              allowNull: true
            });
          }
          
          if (!tableDefinition.resetCodeExpiry) {
            console.log('Adding resetCodeExpiry column to Users table...');
            await sequelize.getQueryInterface().addColumn('Users', 'resetCodeExpiry', {
              type: DataTypes.DATE,
              allowNull: true
            });
          }
        });
    } catch (columnError) {
      console.log('Column addition handled:', columnError.message);
    }
    
    console.log('✅ Database models synced successfully');
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

module.exports = {
  User,
  Post,
  ScheduledPost,
  sequelize,
  syncModels
}; 
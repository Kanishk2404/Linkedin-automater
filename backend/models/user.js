// backend/models/user.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
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
    // Password reset fields
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
  return User;
};
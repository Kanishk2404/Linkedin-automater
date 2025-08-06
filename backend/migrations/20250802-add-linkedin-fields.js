const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add LinkedIn integration fields to User table
    await queryInterface.addColumn('Users', 'linkedinAccessToken', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('Users', 'linkedinRefreshToken', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('Users', 'linkedinProfile', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    
    await queryInterface.addColumn('Users', 'linkedinTokenExpiry', {
      type: DataTypes.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('Users', 'linkedinConnected', {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove LinkedIn integration fields
    await queryInterface.removeColumn('Users', 'linkedinAccessToken');
    await queryInterface.removeColumn('Users', 'linkedinRefreshToken');
    await queryInterface.removeColumn('Users', 'linkedinProfile');
    await queryInterface.removeColumn('Users', 'linkedinTokenExpiry');
    await queryInterface.removeColumn('Users', 'linkedinConnected');
  }
};

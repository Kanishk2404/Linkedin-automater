const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add resetCode column
    await queryInterface.addColumn('Users', 'resetCode', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // Add resetCodeExpiry column
    await queryInterface.addColumn('Users', 'resetCodeExpiry', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns if we need to rollback
    await queryInterface.removeColumn('Users', 'resetCode');
    await queryInterface.removeColumn('Users', 'resetCodeExpiry');
  }
};

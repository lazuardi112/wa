'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'apiKey', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
    await queryInterface.addColumn('Users', 'apiAccessStatus', {
      type: Sequelize.ENUM('none', 'requested', 'approved'),
      defaultValue: 'none'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'apiKey');
    await queryInterface.removeColumn('Users', 'apiAccessStatus');
  }
};

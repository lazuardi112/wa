'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'messageCount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('Users', 'lastResetDate', {
      type: Sequelize.DATE,
      allowNull: true, // Can be null for users who haven't sent messages yet
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'messageCount');
    await queryInterface.removeColumn('Users', 'lastResetDate');
  }
};

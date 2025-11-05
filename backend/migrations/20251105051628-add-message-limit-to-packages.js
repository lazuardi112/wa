'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Packages', 'messageLimitPerDay', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Packages', 'messageLimitPerDay');
  }
};

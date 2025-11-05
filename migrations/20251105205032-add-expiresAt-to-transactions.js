'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Transactions', 'expiresAt', {
      type: Sequelize.DATE,
      allowNull: true, // Allow null for pending/failed transactions
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Transactions', 'expiresAt');
  }
};

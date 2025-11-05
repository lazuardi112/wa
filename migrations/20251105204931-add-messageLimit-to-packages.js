'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Packages', 'messageLimit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Packages', 'messageLimit');
  }
};

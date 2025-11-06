'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'messageLimit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'messageLimit');
  }
};

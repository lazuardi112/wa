'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('BotFlows', 'response', {
      type: Sequelize.JSON,
      allowNull: false,
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('BotFlows', 'response', {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};

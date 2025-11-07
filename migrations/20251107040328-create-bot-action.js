'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BotActions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      triggerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'BotTriggers',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      actionType: {
        type: Sequelize.ENUM('reply', 'webhook'),
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      executionOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('BotActions');
  }
};
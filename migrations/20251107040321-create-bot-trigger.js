'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BotTriggers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      botId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Bots',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      keyword: {
        type: Sequelize.STRING,
        allowNull: false
      },
      matchType: {
        type: Sequelize.ENUM('exact', 'contains', 'startsWith'),
        allowNull: false,
        defaultValue: 'exact'
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
    await queryInterface.dropTable('BotTriggers');
  }
};
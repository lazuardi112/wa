'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Packages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      durationDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      maxDevices: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      messageLimit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50
      },
      apiAccess: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Packages');
  }
};

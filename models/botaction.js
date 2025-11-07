'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BotAction extends Model {
    static associate(models) {
      BotAction.belongsTo(models.BotTrigger, {
        foreignKey: 'triggerId',
        as: 'trigger',
        onDelete: 'CASCADE',
      });
    }
  }
  BotAction.init({
    triggerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'BotTriggers',
        key: 'id'
      }
    },
    actionType: {
      type: DataTypes.ENUM('reply', 'webhook'),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    executionOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    }
  }, {
    sequelize,
    modelName: 'BotAction',
  });
  return BotAction;
};
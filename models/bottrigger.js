'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BotTrigger extends Model {
    static associate(models) {
      BotTrigger.belongsTo(models.Bot, {
        foreignKey: 'botId',
        as: 'bot',
        onDelete: 'CASCADE',
      });
      BotTrigger.hasMany(models.BotAction, {
        foreignKey: 'triggerId',
        as: 'actions',
        onDelete: 'CASCADE',
      });
    }
  }
  BotTrigger.init({
    botId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Bots',
        key: 'id'
      }
    },
    keyword: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    matchType: {
      type: DataTypes.ENUM('exact', 'contains', 'startsWith'),
      allowNull: false,
      defaultValue: 'exact',
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    }
  }, {
    sequelize,
    modelName: 'BotTrigger',
  });
  return BotTrigger;
};
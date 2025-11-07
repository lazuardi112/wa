'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Bot extends Model {
    static associate(models) {
      Bot.belongsTo(models.Device, {
        foreignKey: 'deviceId',
        as: 'device',
        onDelete: 'CASCADE',
      });
      Bot.hasMany(models.BotTrigger, {
        foreignKey: 'botId',
        as: 'triggers',
        onDelete: 'CASCADE',
      });
    }
  }
  Bot.init({
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Devices',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    sequelize,
    modelName: 'Bot',
  });
  return Bot;
};
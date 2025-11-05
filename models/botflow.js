'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BotFlow extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BotFlow.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      BotFlow.belongsTo(models.Device, {
        foreignKey: 'deviceId',
        as: 'device'
      });
      // Self-referencing for parent-child relationship
      BotFlow.hasMany(models.BotFlow, {
        foreignKey: 'parentId',
        as: 'children'
      });
      BotFlow.belongsTo(models.BotFlow, {
        foreignKey: 'parentId',
        as: 'parent'
      });
    }
  }
  BotFlow.init({
    userId: DataTypes.INTEGER,
    deviceId: DataTypes.INTEGER,
    prefix: DataTypes.STRING,
    response: DataTypes.TEXT,
    isEnabled: DataTypes.BOOLEAN,
    parentId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'BotFlow',
  });
  return BotFlow;
};
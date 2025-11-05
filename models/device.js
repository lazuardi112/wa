'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Device extends Model {
    static associate(models) {
      // Device belongs to a User
      Device.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  Device.init({
    instanceId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    remark: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('uninitialized', 'connecting', 'connected', 'disconnected', 'waiting_qr'),
      defaultValue: 'uninitialized'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Device',
  });
  return Device;
};

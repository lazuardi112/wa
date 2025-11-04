'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Package extends Model {
    static associate(models) {
      // Package can be associated with many Users
      Package.hasMany(models.User, { foreignKey: 'packageId', as: 'users' });
    }
  }
  Package.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    maxDevices: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    apiAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Package',
  });
  return Package;
};

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Otp extends Model {
    static associate(models) {
      // OTP belongs to a User
      Otp.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  Otp.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      unique: true // A user can only have one active OTP at a time
    }
  }, {
    sequelize,
    modelName: 'Otp',
  });
  return Otp;
};

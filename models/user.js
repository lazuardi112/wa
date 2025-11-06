'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User has many Devices
      User.hasMany(models.Device, { foreignKey: 'userId', as: 'devices' });
      // User has many Transactions
      User.hasMany(models.Transaction, { foreignKey: 'userId', as: 'transactions' });
      // User has one Package
      User.belongsTo(models.Package, { foreignKey: 'packageId', as: 'package' });
      // User has one OTP
      User.hasOne(models.Otp, { foreignKey: 'userId', as: 'otp' });
    }
  }
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    messageLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    packageId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Packages',
        key: 'id',
      }
    },
    packageExpiresAt: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  // Instance method to compare password
  User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  return User;
};

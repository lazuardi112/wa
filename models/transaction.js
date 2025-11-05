'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      // Transaction belongs to a User
      Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      // Transaction is for a Package
      Transaction.belongsTo(models.Package, { foreignKey: 'packageId', as: 'package' });
    }
  }
  Transaction.init({
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'expired'),
      defaultValue: 'pending'
    },
    paymentGatewayData: DataTypes.JSON,
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    packageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Packages',
        key: 'id'
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Transaction',
  });
  return Transaction;
};

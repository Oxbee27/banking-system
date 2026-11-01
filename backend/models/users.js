"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    static associate(models) {
      users.hasMany(models.transactions, {
        foreignKey: "senderId",
        as: "sentTransactions",
      });

      users.hasMany(models.transactions, {
        foreignKey: "receiverId",
        as: "receivedTransactions",
      });

      users.hasMany(models.payments, {
        foreignKey: "userId",
        as: "payments",
      });
    }
  }

  users.init(
    {
      name: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: DataTypes.STRING,
      accountNumber: {
        type: DataTypes.STRING,
        unique: true,
      },
      balance: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: "user",
        allowNull: false,
      },
      pin: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "users",
    },
  );

  return users;
};

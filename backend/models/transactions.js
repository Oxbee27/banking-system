"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class transactions extends Model {
    static associate(models) {
      transactions.belongsTo(models.users, {
        foreignKey: "senderId",
        as: "sender",
      });

      transactions.belongsTo(models.users, {
        foreignKey: "receiverId",
        as: "receiver",
      });
    }
  }

  transactions.init(
    {
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      receiverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      senderAccount: DataTypes.STRING,
      receiverAccount: DataTypes.STRING,
      amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "successful",
      },
    },
    {
      sequelize,
      modelName: "transactions",
    },
  );

  return transactions;
};

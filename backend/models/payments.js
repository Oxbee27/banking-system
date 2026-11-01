"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class payments extends Model {
    static associate(models) {
      payments.belongsTo(models.users, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  payments.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "NGN",
      },
      reference: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
      },
      accessCode: DataTypes.STRING,
      authorizationUrl: DataTypes.STRING,
      gatewayResponse: DataTypes.JSON,
      metadata: DataTypes.JSON,
      paidAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "payments",
    },
  );

  return payments;
};

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "accountNumber", {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn("users", "balance", {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "user",
    });
    await queryInterface.addColumn("users", "pin", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "pin");
    await queryInterface.removeColumn("users", "role");
    await queryInterface.removeColumn("users", "balance");
    await queryInterface.removeColumn("users", "accountNumber");
  },
};

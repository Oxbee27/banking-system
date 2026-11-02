"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rate_limits", {
      id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        primaryKey: true,
      },
      totalHits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      resetAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("rate_limits", ["resetAt"], {
      name: "rate_limits_reset_at_index",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rate_limits");
  },
};

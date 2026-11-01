"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "payments" ALTER COLUMN "amount" TYPE BIGINT USING ROUND("amount" * 100)::BIGINT',
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE "payments" ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ("amount"::DECIMAL / 100)',
    );
  },
};

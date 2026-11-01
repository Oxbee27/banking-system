"use strict";

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT COUNT(*)::INTEGER AS total
      FROM users
      WHERE role = 'admin'
    `);

    if (rows[0].total > 1) {
      throw new Error(
        "Multiple administrators already exist. Resolve them before applying this migration."
      );
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX users_single_admin_only
      ON users (role)
      WHERE role = 'admin'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_single_admin_only
    `);
  },
};

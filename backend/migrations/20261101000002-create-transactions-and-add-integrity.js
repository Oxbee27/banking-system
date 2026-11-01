"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Enforce unique, non-null user emails.
    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.addIndex("users", ["email"], {
      unique: true,
      name: "users_email_unique",
    });

    // Connect payments to their owners.
    await queryInterface.addConstraint("payments", {
      fields: ["userId"],
      type: "foreign key",
      name: "payments_userId_fkey",
      references: {
        table: "users",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    // Create the transaction ledger.
    await queryInterface.createTable("transactions", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      senderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      receiverId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      senderAccount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      receiverAccount: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(18, 2),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "successful",
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

    await queryInterface.addIndex("transactions", ["senderId", "createdAt"], {
      name: "transactions_sender_created_at",
    });

    await queryInterface.addIndex("transactions", ["receiverId", "createdAt"], {
      name: "transactions_receiver_created_at",
    });

    await queryInterface.addIndex("transactions", ["type", "status"], {
      name: "transactions_type_status",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("transactions");

    await queryInterface.removeConstraint(
      "payments",
      "payments_userId_fkey",
    );

    await queryInterface.removeIndex("users", "users_email_unique");

    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};

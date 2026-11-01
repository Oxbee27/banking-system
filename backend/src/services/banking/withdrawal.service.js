const bcrypt = require("bcrypt");

const {
  addTransaction,
  updateUser,
  findUserById,
} = require("../../database/user");
const { getUserById, withDatabaseTransaction } = require("./helpers");

const withdrawMoney = async (userId, amount, pin) => {
  return withDatabaseTransaction(async (transaction) => {
    const user = await getUserById(userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
      const error = new Error("User account not found");
      error.statusCode = 404;
      throw error;
    }

    if (!user.pin) {
      const error = new Error("Please create your transaction PIN first");
      error.statusCode = 400;
      throw error;
    }

    const validPin = await bcrypt.compare(String(pin), user.pin);

    if (!validPin) {
      const error = new Error("Invalid transaction PIN");
      error.statusCode = 401;
      throw error;
    }

    const numericAmount = Number(amount);
    if (Number(user.balance) < numericAmount) {
      const error = new Error("Insufficient balance");
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await updateUser(
      userId,
      {
        balance: Number(user.balance) - numericAmount,
      },
      { transaction },
    );

    const ledgerEntry = await addTransaction(
      {
        senderId: user.id,
        receiverId: null,
        senderAccount: user.accountNumber,
        receiverAccount: null,
        amount: numericAmount,
        type: "withdrawal",
        status: "successful",
      },
      { transaction },
    );

    return {
      transactionId: ledgerEntry.id,
      amount: numericAmount,
      newBalance: updatedUser.balance,
    };
  });
};

module.exports = {
  withdrawMoney,
};

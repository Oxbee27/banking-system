const { addTransaction, updateUser } = require("../../database/user");
const { getUserById, withDatabaseTransaction } = require("./helpers");

const depositMoney = async (userId, amount) => {
  const numericAmount = Number(amount);

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

    const updatedUser = await updateUser(
      userId,
      {
        balance: Number(user.balance) + numericAmount,
      },
      { transaction },
    );

    const ledgerEntry = await addTransaction(
      {
        senderId: null,
        receiverId: user.id,
        senderAccount: null,
        receiverAccount: user.accountNumber,
        amount: numericAmount,
        type: "deposit",
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
  depositMoney,
};

const bcrypt = require("bcrypt");

const {
  updateUser,
  addTransaction,
  findUserById,
} = require("../../database/user");
const {
  getUserById,
  getUserByAccountNumber,
  withDatabaseTransaction,
} = require("./helpers");

const transferMoney = async (userId, accountNumber, amount, pin) => {
  const sender = await getUserById(userId);

  if (!sender) {
    const error = new Error("Sender account not found");
    error.statusCode = 404;
    throw error;
  }

  const receiver = await getUserByAccountNumber(accountNumber);

  if (!receiver) {
    const error = new Error("Recipient account not found");
    error.statusCode = 404;
    throw error;
  }

  if (sender.id === receiver.id) {
    const error = new Error("You cannot transfer money to yourself");
    error.statusCode = 400;
    throw error;
  }

  if (!sender.pin) {
    const error = new Error("Please create your transaction PIN first");
    error.statusCode = 400;
    throw error;
  }

  const validPin = await bcrypt.compare(String(pin), sender.pin);

  if (!validPin) {
    const error = new Error("Invalid transaction PIN");
    error.statusCode = 401;
    throw error;
  }

  const numericAmount = Number(amount);
  return withDatabaseTransaction(async (transaction) => {
    const lockedUsers = new Map();
    const lockOrder = [sender.id, receiver.id].sort(
      (left, right) => left - right,
    );
    for (const id of lockOrder) {
      lockedUsers.set(
        id,
        await getUserById(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
      );
    }

    const lockedSender = lockedUsers.get(sender.id);
    const lockedReceiver = lockedUsers.get(receiver.id);
    if (!lockedSender || !lockedReceiver) {
      const error = new Error("A transfer account could not be found");
      error.statusCode = 404;
      throw error;
    }

    const validCurrentPin = await bcrypt.compare(
      String(pin),
      lockedSender.pin || "",
    );
    if (!validCurrentPin) {
      const error = new Error("Invalid transaction PIN");
      error.statusCode = 401;
      throw error;
    }

    if (Number(lockedSender.balance) < numericAmount) {
      const error = new Error("Insufficient balance");
      error.statusCode = 400;
      throw error;
    }

    await updateUser(
      lockedSender.id,
      { balance: Number(lockedSender.balance) - numericAmount },
      { transaction },
    );
    await updateUser(
      lockedReceiver.id,
      { balance: Number(lockedReceiver.balance) + numericAmount },
      { transaction },
    );

    const ledgerEntry = await addTransaction(
      {
        senderId: lockedSender.id,
        receiverId: lockedReceiver.id,
        senderAccount: lockedSender.accountNumber,
        receiverAccount: lockedReceiver.accountNumber,
        amount: numericAmount,
        type: "transfer",
        status: "successful",
      },
      { transaction },
    );

    const updatedSender = await findUserById(lockedSender.id, { transaction });
    return {
      transactionId: ledgerEntry.id,
      amount: numericAmount,
      recipient: lockedReceiver.name,
      recipientAccount: lockedReceiver.accountNumber,
      newBalance: updatedSender.balance,
    };
  });
};

module.exports = {
  transferMoney,
};

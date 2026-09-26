const bcrypt = require("bcrypt");

const {
    users,
    transactions
} = require("../../database/user");

const { getUserById } = require("./helpers");


const transferMoney = async (
    userId,
    accountNumber,
    amount,
    pin
) => {

    const sender = getUserById(userId);

    if (!sender) {
        const error = new Error(
            "Sender account not found"
        );

        error.statusCode = 404;

        throw error;
    }

    const receiver = users.find(
        user =>
            user.accountNumber === String(accountNumber)
    );

    if (!receiver) {
        const error = new Error(
            "Recipient account not found"
        );

        error.statusCode = 404;

        throw error;
    }

    if (sender.id === receiver.id) {
        const error = new Error(
            "You cannot transfer money to yourself"
        );

        error.statusCode = 400;

        throw error;
    }

    if (!sender.pin) {
        const error = new Error(
            "Please create your transaction PIN first"
        );

        error.statusCode = 400;

        throw error;
    }

    const validPin = await bcrypt.compare(
        String(pin),
        sender.pin
    );

    if (!validPin) {
        const error = new Error(
            "Invalid transaction PIN"
        );

        error.statusCode = 401;

        throw error;
    }

    if (sender.balance < amount) {
        const error = new Error(
            "Insufficient balance"
        );

        error.statusCode = 400;

        throw error;
    }

    sender.balance -= amount;

    receiver.balance += amount;

    const transaction = {
        id: transactions.length + 1,
        senderId: sender.id,
        receiverId: receiver.id,
        senderAccount: sender.accountNumber,
        receiverAccount: receiver.accountNumber,
        amount,
        type: "transfer",
        status: "successful",
        createdAt: new Date()
    };

    transactions.push(transaction);

    return {
        transactionId: transaction.id,
        amount,
        recipient: receiver.name,
        recipientAccount: receiver.accountNumber,
        newBalance: sender.balance
    };
};

module.exports = {
    transferMoney
};
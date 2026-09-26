const bcrypt = require("bcrypt");

const {
    transactions
} = require("../../database/user");

const { getUserById } = require("./helpers");

const withdrawMoney = async (
    userId,
    amount,
    pin
) => {

    const user = getUserById(userId);

    if (!user) {
        const error = new Error(
            "User account not found"
        );

        error.statusCode = 404;

        throw error;
    }

    if (!user.pin) {
        const error = new Error(
            "Please create your transaction PIN first"
        );

        error.statusCode = 400;

        throw error;
    }

    const validPin = await bcrypt.compare(
        String(pin),
        user.pin
    );

    if (!validPin) {
        const error = new Error(
            "Invalid transaction PIN"
        );

        error.statusCode = 401;

        throw error;
    }

    if (user.balance < amount) {
        const error = new Error(
            "Insufficient balance"
        );

        error.statusCode = 400;

        throw error;
    }

    user.balance -= amount;

    const transaction = {
        id: transactions.length + 1,
        senderId: user.id,
        receiverId: null,
        senderAccount: user.accountNumber,
        receiverAccount: null,
        amount,
        type: "withdrawal",
        status: "successful",
        createdAt: new Date()
    };

    transactions.push(transaction);

    return {
        transactionId: transaction.id,
        amount,
        newBalance: user.balance
    };
};

module.exports = {
    withdrawMoney
};
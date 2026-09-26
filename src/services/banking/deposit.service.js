const {
    transactions
} = require("../../database/user");

const { getUserById } = require("./helpers");


const depositMoney = (userId, amount) => {

    const user = getUserById(userId);

    if (!user) {
        const error = new Error(
            "User account not found"
        );

        error.statusCode = 404;

        throw error;
    }

    user.balance += amount;

    const transaction = { 
        id: transactions.length + 1,
        senderId: null,
        receiverId: user.id,
        senderAccount: null,
        receiverAccount: user.accountNumber,
        amount,
        type: "deposit",
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
    depositMoney
};
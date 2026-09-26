const {
    transactions
} = require("../../database/user");


const getTransactions = (userId) => {

    return transactions.filter(
        transaction =>
            transaction.senderId === userId ||
            transaction.receiverId === userId
    );
};

module.exports = {
    getTransactions
};
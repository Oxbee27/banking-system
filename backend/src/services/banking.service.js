const { getBalance } = require("./banking/balance.service");

const { createPin, updatePin } = require("./banking/pin.service");

const { transferMoney } = require("./banking/transfer.service");

const { depositMoney } = require("./banking/deposit.service");

const { withdrawMoney } = require("./banking/withdrawal.service");

const {getTransactions } = require("./banking/transaction.service");


module.exports = {
    getBalance,
    createPin,
    updatePin,
    transferMoney,
    depositMoney,
    withdrawMoney,
    getTransactions
};
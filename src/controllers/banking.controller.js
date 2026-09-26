const { users, transactions } = require("../database/user");

const adminCreditBalance = (req, res, next) => {
    try {
        const userId = Number(req.params.userId);
        const { amount } = req.body;

        // Check amount
        if (!amount) {
            return res.status(400).json({
                status: "error",
                message: "Please enter an amount."
            });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({
                status: "error",
                message: "Amount must be greater than zero."
            });
        }

        // Find the user
        const user = users.find(
            user => user.id === userId
        );

        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User account not found."
            });
        }

        const creditAmount = Number(amount);

        // Increase user's balance
        user.balance += creditAmount;

        // Record transaction
        const transaction = {
            id: transactions.length + 1,
            type: "admin_credit",
            amount: creditAmount,
            from: req.user.id,
            to: user.id,
            status: "completed",
            createdAt: new Date()
        };

        transactions.push(transaction);

        return res.status(200).json({
            status: "success",
            message: "User balance credited successfully.",
            data: {
                userId: user.id,
                name: user.name,
                amountCredited: creditAmount,
                newBalance: user.balance
            }
        });

    } catch (error) {
        next(error);
    }
};



const {
    getBalance: getBalanceService,
    createPin: createPinService,
    updatePin: updatePinService,
    transferMoney: transferMoneyService,
    depositMoney: depositMoneyService,
    withdrawMoney: withdrawMoneyService,
    getTransactions: getTransactionsService
} = require("../services/banking.service");



const getBalance = (req, res, next) => {

    try {

        const balance = getBalanceService(
            req.user.id
        );

        return res.status(200).json({
            status: "success",
            data: balance
        });

    } catch (error) {
        next(error);
    }
};



const createPin = async (req, res, next) => {

    try {

        await createPinService(
            req.user.id,
            req.body.pin
        );

        return res.status(201).json({
            status: "success",
            message: "Transaction PIN created successfully"
        });

    } catch (error) {
        next(error);
    }
};


const updatePin = async (req, res, next) => {

    try {

        const {
            currentPin,
            newPin
        } = req.body;

        await updatePinService(
            req.user.id,
            currentPin,
            newPin
        );

        return res.status(200).json({
            status: "success",
            message: "PIN updated successfully"
        });

    } catch (error) {
        next(error);
    }
};

const transferMoney = async (req, res, next) => {

    try {

        const {
            accountNumber,
            amount,
            pin
        } = req.body;

        const result = await transferMoneyService(
            req.user.id,
            accountNumber,
            amount,
            pin
        );

        return res.status(200).json({
            status: "success",
            message: "Transfer successful",
            data: result
        });

    } catch (error) {
        next(error);
    }
};



const depositMoney = (req, res, next) => {

    try {

        const { amount } = req.body;

        const result = depositMoneyService(
            req.user.id,
            amount
        );

        return res.status(200).json({
            status: "success",
            message: "Deposit successful",
            data: result
        });

    } catch (error) {
        next(error);
    }
};


const withdrawMoney = async (req, res, next) => {

    try {

        const {
            amount,
            pin
        } = req.body;

        const result = await withdrawMoneyService(
            req.user.id,
            amount,
            pin
        );

        return res.status(200).json({
            status: "success",
            message: "Withdrawal successful",
            data: result
        });

    } catch (error) {
        next(error);
    }
};




const getTransactions = (req, res, next) => {

    try {

        const userTransactions =
            getTransactionsService(req.user.id);

        return res.status(200).json({
            status: "success",
            data: userTransactions
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    getBalance,
    createPin,
    updatePin,
    transferMoney,
    depositMoney,
    withdrawMoney,
    getTransactions,
    adminCreditBalance
};


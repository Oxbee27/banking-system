const { z } = require("zod");

// Accept positive monetary amounts with a maximum of two decimal places.
const moneyAmountSchema = z
    .number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number"
    })
    .finite("Amount must be a valid number")
    .positive("Amount must be greater than zero")
    .refine(
        amount => {
            const minorUnits = Math.round(amount * 100);

            return (
                Number.isSafeInteger(minorUnits) &&
                Math.abs(amount * 100 - minorUnits) < 1e-7
            );
        },
        "Amount must have no more than two decimal places"
    );

const createPinSchema = z.object({
    pin: z
        .string()
        .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
});

const updatePinSchema = z.object({
    currentPin: z
        .string()
        .regex(/^\d{4}$/, "Current PIN must be exactly 4 digits"),

    newPin: z
        .string()
        .regex(/^\d{4}$/, "New PIN must be exactly 4 digits")
});

const transferSchema = z.object({
    accountNumber: z.string(),

    amount: moneyAmountSchema,

    pin: z
        .string()
        .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
});

const depositSchema = z.object({
    amount: moneyAmountSchema
});

const adminCreditSchema = z.object({
    amount: moneyAmountSchema
});

const withdrawSchema = z.object({
    amount: moneyAmountSchema,

    pin: z
        .string()
        .length(4, "PIN must be exactly 4 digits")
        .regex(/^\d+$/, "PIN must contain only numbers")
});

module.exports = {
    createPinSchema,
    updatePinSchema,
    transferSchema,
    depositSchema,
    adminCreditSchema,
    withdrawSchema
};

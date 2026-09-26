const { z } = require("zod");

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

    amount: z
        .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number"
        })
        .positive("Amount must be greater than zero"),

    pin: z
        .string()
        .regex(/^\d{4}$/, "PIN must be exactly 4 digits")
});


const depositSchema = z.object({
    amount: z
        .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number"
        })
        .positive("Amount must be greater than zero")
});

const withdrawSchema = z.object({
    amount: z
        .number({
            required_error: "Amount is required",
            invalid_type_error: "Amount must be a number"
        })
        .positive("Amount must be greater than zero"),

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
    withdrawSchema
};
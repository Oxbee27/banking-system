const { z } = require("zod");

const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters"),

    email: z
        .string()
        .trim()
        .email("Please provide a valid email address"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters")

});


const loginSchema = z
    .object({
        email: z
            .string()
            .trim()
            .email("Please provide a valid email address"),

        password: z
            .string()
            .min(1, "Password is required")
    })
    .strict();


module.exports = {
    registerSchema,
    loginSchema
};
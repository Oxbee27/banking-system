const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please provide a valid email address"),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
}).strict();

const adminCreationSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: passwordSchema,
  adminCode: z.string().min(1),
}).strict();

module.exports = {
  registerSchema,
  loginSchema,
  adminCreationSchema,
};

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { users } = require("../database/user");

const registerUser = async ({ name, email, password}) => {
    const normalizedEmail = email.toLowerCase();

    const existingUser = users.find(
        user => user.email === normalizedEmail
    );

    if (existingUser) {
        const error = new Error("User already exists");
        error.statusCode = 409;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(
        password,
        Number(process.env.SALT_ROUNDS) || 10
    );

    const accountNumber =
        "10" + Math.floor(
            100000000 + Math.random() * 900000000
        );

    const newUser = {
        id: users.length + 1,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        accountNumber,
        balance,
        pin: null,
    createdAt: new Date()
    };

    users.push(newUser);

    return newUser;
};


const loginUser = async ({ email, password }) => {
    const normalizedEmail = email.toLowerCase();

    const user = users.find(
        user => user.email === normalizedEmail
    );

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatch) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            accountNumber: user.accountNumber,
             role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    return token;
};


module.exports = {
    registerUser,
    loginUser
};
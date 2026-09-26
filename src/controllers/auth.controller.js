const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { users } = require("../database/user");

const { registerUser, loginUser } = require("../services/auth.service");


const register = async (req, res, next) => {

    try {

        const user = await registerUser(req.body);

        return res.status(201).json({
            status: "success",
            message: "Account created successfully",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                accountNumber: user.accountNumber,
                balance: user.balance,
                role: user.role
            }
        });

    } catch (error) {
        next(error);
    }
};


const login = async (req, res, next) => {

    try {

        const token = await loginUser(req.body);

        return res.status(200).json({
            status: "success",
            message: "Login successful",
            token
        });

    } catch (error) {
        next(error);
    }
};


const createAdmin = async (req, res) => {
    try {
        const { name, email, password, adminCode } = req.body;

        if (!name || !email || !password || !adminCode) {
            return res.status(400).json({
                status: "error",
                message: "Name, email, password and admin code are required."
            });
        }

        if (adminCode !== process.env.ADMIN_CREATION_KEY) {
            return res.status(403).json({
                status: "error",
                message: "Invalid admin creation code."
            });
        }

        const existingUser = users.find(
            user => user.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                status: "error",
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = {
            id: users.length + 1,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: "admin",
            balance: 0
        };

        users.push(newAdmin);

        return res.status(201).json({
            status: "success",
            message: "Admin account created successfully.",
            data: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
                balance: newAdmin.balance
            }
        });

    } catch (error) {
        next(error);
    }
};



module.exports = {
    register,
    login,
     createAdmin
};
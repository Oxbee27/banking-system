const express = require("express");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const userRouter = require("./routes/user.route");
const authRouter = require("./routes/auth.route");
const bankingRouter = require("./routes/banking.route");

const app = express();

app.use(express.json());

app.use(logger);

app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Banking API is running"
    });
});

app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/banking", bankingRouter);


app.use((req, res) => {
    res.status(404).json({
        status: "error",
        message: "Route not found"
    });
});


app.use(errorHandler);

module.exports = app;
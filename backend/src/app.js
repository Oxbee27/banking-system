const express = require("express");
const cors = require("cors");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");

const userRouter = require("./routes/user.route");
const authRouter = require("./routes/auth.route");
const bankingRouter = require("./routes/banking.route");

const app = express();


const allowedOrigins = new Set();

if (process.env.FRONTEND_URL) {
  try {
    allowedOrigins.add(new URL(process.env.FRONTEND_URL).origin);
  } catch {
    throw new Error("FRONTEND_URL must be a valid URL");
  }
}

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
}



// Trust the single reverse-proxy hop used by Render.
app.set("trust proxy", 1);


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
}));

app.use(
  express.json({
    verify: (req, res, buffer) => {
      if (req.path === "/banking/paystack/webhook") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }),
);

app.use(logger);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Banking API is running",
  });
});

app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/banking", bankingRouter);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;

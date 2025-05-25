import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "../auth-backend/config/db.js";

import authRoutes from "./routes/auth.js";

import { errorHandler } from "./middlewares/error.js";

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

// Error handler middleware
app.use(errorHandler);

// Use process.env.PORT or default 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`Server started and connected to DB, listening on port ${PORT}`);
  } catch (error) {
    console.error("DB connection failed:", error);
  }
});

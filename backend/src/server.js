
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

let dbConnected = false;

const initialize = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
};

app.use(async (req, res, next) => {
  try {
    await initialize();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      message: "Không thể kết nối cơ sở dữ liệu.",
    });
  }
});

export default app;

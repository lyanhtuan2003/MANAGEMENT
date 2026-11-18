
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("Thiếu MONGODB_URI trong file .env");
    }

    await mongoose.connect(mongoURI);

    console.log("MongoDB kết nối thành công!");
  } catch (error) {
    console.error("Lỗi MongoDB:", error.message);
    throw error;
  }
};

export default connectDB;


import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const createAdmin = async () => {
  try {
    console.log("Đang kết nối MongoDB...");

    await connectDB();

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Quản trị hệ thống";

    if (!email || !password) {
      throw new Error("Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD.");
    }

    if (password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
    }

    // Tìm đúng tài khoản theo email
    let admin = await User.findOne({ email }).select("+password");

    if (admin && admin.role !== "manager") {
      throw new Error(
        "Email này đã thuộc tài khoản không phải quản lý."
      );
    }

    if (admin) {
      admin.name = name;
      admin.password = password;
      admin.position = "Giám đốc";
      admin.department = "Ban quản lý";
      admin.status = "working";
      admin.isActive = true;
      admin.mustChangePassword = false;

      await admin.save();

      console.log("Đã cập nhật tài khoản quản lý.");
    } else {
      admin = await User.create({
        name,
        email,
        password,
        role: "manager",
        position: "Giám đốc",
        department: "Ban quản lý",
        status: "working",
        isActive: true,
        mustChangePassword: false,
      });

      console.log("Đã tạo tài khoản quản lý.");
    }

    console.log("--------------------------------");
    console.log("Email:", admin.email);
    console.log("Vai trò:", admin.role);
    console.log("Mật khẩu đã được cập nhật.");
    console.log("--------------------------------");

  } catch (error) {
    console.error("LỖI TẠO TÀI KHOẢN:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

createAdmin();

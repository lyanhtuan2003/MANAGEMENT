
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
      throw new Error(
        "Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env"
      );
    }

    if (password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
    }

    // Kiểm tra email đã được sử dụng chưa
    const existingEmail = await User.findOne({ email });

    if (existingEmail && existingEmail.role !== "manager") {
      throw new Error(
        "Email này đang thuộc tài khoản nhân viên."
      );
    }

    // Tìm tài khoản quản lý hiện tại
    let admin = await User.findOne({ role: "manager" });

    if (admin) {
      // Cập nhật tài khoản quản lý
      admin.name = name;
      admin.email = email;
      admin.password = password;
      admin.position = "Giám đốc";
      admin.department = "Ban quản lý";
      admin.status = "working";
      admin.isActive = true;

      await admin.save();

      console.log("ĐÃ CẬP NHẬT TÀI KHOẢN QUẢN LÝ!");
    } else {
      // Tạo tài khoản quản lý mới
      admin = await User.create({
        name,
        email,
        password,
        role: "manager",
        position: "Giám đốc",
        department: "Ban quản lý",
        status: "working",
        isActive: true
      });

      console.log("ĐÃ TẠO TÀI KHOẢN QUẢN LÝ!");
    }

    console.log("--------------------------------");
    console.log("EMAIL:", admin.email);
    console.log("VAI TRÒ:", admin.role);
    console.log("MẬT KHẨU:", "Đã cập nhật theo .env");
    console.log("--------------------------------");

  } catch (error) {
    console.error("LỖI TẠO TÀI KHOẢN:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();

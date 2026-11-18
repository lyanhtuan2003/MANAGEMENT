
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// =====================================
// THÔNG TIN TÀI KHOẢN TRẢ VỀ FRONTEND
// =====================================

const userResponse = (user) => ({
  id: user._id,
  employeeCode: user.employeeCode,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  position: user.position,
  department: user.department,
  role: user.role,
  status: user.status,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
});

// =====================================
// ĐĂNG NHẬP
// POST /api/auth/login
// =====================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    if (!user.isActive || user.status === "resigned") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("Thiếu JWT_SECRET trong file .env");
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: user.mustChangePassword
        ? "Bạn cần đổi mật khẩu trước khi tiếp tục."
        : "Đăng nhập thành công.",
      token,
      user: userResponse(user),
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi đăng nhập.",
    });
  }
};

// =====================================
// LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI
// GET /api/auth/me
// =====================================

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    return res.status(200).json({
      success: true,
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Get me error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin tài khoản.",
    });
  }
};

// =====================================
// ĐỔI MẬT KHẨU
// POST /api/auth/change-password
// =====================================

export const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Kiểm tra dữ liệu
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin mật khẩu.",
      });
    }

    // Kiểm tra độ dài
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được vượt quá 128 ký tự.",
      });
    }

    // Kiểm tra xác nhận mật khẩu
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp.",
      });
    }

    // Lấy tài khoản kèm mật khẩu đã mã hóa
    const user = await User.findById(req.user._id)
      .select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    if (!user.isActive || user.status === "resigned") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản không còn hoạt động.",
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác.",
      });
    }

    // Không cho dùng lại mật khẩu hiện tại
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      });
    }

    // Cập nhật mật khẩu
    // Hook pre-save trong User.js sẽ tự mã hóa bcrypt
    user.password = newPassword;
    user.mustChangePassword = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công.",
      user: userResponse(user),
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đổi mật khẩu.",
    });
  }
};

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ======================================
// XÁC THỰC NGƯỜI DÙNG
// ======================================

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Kiểm tra token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }

    // Kiểm tra JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET chưa được cấu hình.");

      return res.status(500).json({
        success: false,
        message: "Máy chủ chưa được cấu hình xác thực.",
      });
    }

    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Thông tin đăng nhập không hợp lệ.",
      });
    }

    // Tìm người dùng trong MongoDB
    const user = await User.findById(decoded.id);

    // Kiểm tra tài khoản
    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    // Gắn thông tin người dùng vào request
    req.user = user;

    next();
  } catch (error) {
    console.error("Lỗi xác thực:", error.message);

    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
};

// ======================================
// PHÂN QUYỀN THEO VAI TRÒ
// ======================================

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này.",
      });
    }

    next();
  };
};

// ======================================
// QUYỀN DÀNH CHO QUẢN LÝ VÀ KẾ TOÁN
// ======================================

export const authorizeCompanyFinance = authorize(
  "manager",
  "accountant"
);

// ======================================
// QUYỀN CHỈ DÀNH CHO QUẢN LÝ
// ======================================

export const authorizeManager = authorize("manager");

// ======================================
// QUYỀN DÀNH CHO NHÂN VIÊN
// ======================================

export const authorizeEmployee = authorize("employee");


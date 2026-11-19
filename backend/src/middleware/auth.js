
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ======================================
// CẤU HÌNH ROLE
// ======================================

const VALID_ROLES = [
  "manager",
  "accountant",
  "employee",
];

// ======================================
// CHUẨN HÓA ROLE
// ======================================

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toLowerCase();
};

// ======================================
// XÁC THỰC NGƯỜI DÙNG
// ======================================

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

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

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET chưa được cấu hình.");

      return res.status(500).json({
        success: false,
        message: "Máy chủ chưa được cấu hình xác thực.",
      });
    }

    // Giải mã token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Hỗ trợ nhiều cách đặt tên ID trong JWT
    const userId =
      decoded.id ||
      decoded.userId ||
      decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Token không chứa thông tin tài khoản.",
      });
    }

    if (!User.schema.path("_id")) {
      return res.status(500).json({
        success: false,
        message: "Cấu hình dữ liệu người dùng không hợp lệ.",
      });
    }

    // Lấy thông tin mới nhất từ MongoDB
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại.",
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị khóa.",
      });
    }

    // Chuẩn hóa quyền
    const role = normalizeRole(user.role);

    if (!VALID_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản chưa được phân quyền hợp lệ.",
      });
    }

    // Gắn thông tin người dùng vào request
    req.user = user;
    req.userRole = role;

    next();
  } catch (error) {
    console.error("Lỗi xác thực:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }

    if (error.name === "CastError") {
      return res.status(401).json({
        success: false,
        message: "Thông tin tài khoản không hợp lệ.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ khi xác thực tài khoản.",
    });
  }
};

// ======================================
// PHÂN QUYỀN THEO ROLE
// ======================================

export const authorize = (...roles) => {
  const allowedRoles = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập.",
      });
    }

    const currentRole = normalizeRole(
      req.userRole || req.user.role
    );

    if (!allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng này.",
      });
    }

    next();
  };
};

// ======================================
// QUẢN LÝ VÀ KẾ TOÁN
// ======================================

export const authorizeCompanyFinance = authorize(
  "manager",
  "accountant"
);

// ======================================
// CHỈ QUẢN LÝ
// ======================================

export const authorizeManager = authorize(
  "manager"
);

// ======================================
// NHÂN VIÊN VÀ KẾ TOÁN
// XEM BẢNG LƯƠNG CÁ NHÂN
// ======================================

export const authorizeEmployee = authorize(
  "employee",
  "accountant"
);

// ======================================
// TẤT CẢ NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
// ======================================

export const authorizeAll = authorize(
  "manager",
  "accountant",
  "employee"
);

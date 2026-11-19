import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// ======================================
// IMPORT ROUTES
// ======================================

import authRoutes from "./routes/auth.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import accountantRoutes from "./routes/accountant.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import leaveRoutes from "./routes/leave.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import projectRoutes from "./routes/project.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import rewardRoutes from "./routes/reward.routes.js";
import companyTransactionRoutes from "./routes/companyTransaction.routes.js";

// ======================================
// IMPORT ERROR HANDLER
// ======================================

import errorHandler from "./middleware/errorHandler.js";

// ======================================
// KHỞI TẠO EXPRESS
// ======================================

const app = express();

// ======================================
// BẢO MẬT SERVER
// ======================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ======================================
// CORS
// ======================================

const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin
      // Ví dụ: Postman hoặc request nội bộ
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin không được phép truy cập API.")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ======================================
// MIDDLEWARE XỬ LÝ REQUEST
// ======================================

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(morgan("dev"));

// ======================================
// KIỂM TRA SERVER
// GET /
// ======================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Internal Management API is running.",
    version: "1.0.0",

    modules: [
      "Authentication",
      "Employee Management",
      "Accountant Management",
      "Attendance Management",
      "Leave Management",
      "Payroll Management",
      "Project Management",
      "Notification Management",
      "Reward & Penalty Management",
      "Company Finance Management",
    ],

    endpoints: {
      authentication: "/api/auth",
      employees: "/api/employees",
      accountants: "/api/accountants",
      attendance: "/api/attendance",
      leave: "/api/leave",
      payroll: "/api/payroll",
      projects: "/api/projects",
      notifications: "/api/notifications",
      rewards: "/api/rewards",
      companyTransactions: "/api/company-transactions",
    },
  });
});

// ======================================
// ĐĂNG KÝ API
// ======================================

// 1. XÁC THỰC VÀ ĐĂNG NHẬP
app.use("/api/auth", authRoutes);

// 2. QUẢN LÝ NHÂN VIÊN
app.use("/api/employees", employeeRoutes);

// 3. QUẢN LÝ TÀI KHOẢN KẾ TOÁN
app.use("/api/accountants", accountantRoutes);

// 4. QUẢN LÝ CHẤM CÔNG
app.use("/api/attendance", attendanceRoutes);

// 5. QUẢN LÝ NGHỈ PHÉP
app.use("/api/leave", leaveRoutes);

// 6. QUẢN LÝ BẢNG LƯƠNG
app.use("/api/payroll", payrollRoutes);

// 7. QUẢN LÝ DỰ ÁN
app.use("/api/projects", projectRoutes);

// 8. QUẢN LÝ THÔNG BÁO
app.use("/api/notifications", notificationRoutes);

// 9. QUẢN LÝ THƯỞNG VÀ PHẠT
app.use("/api/rewards", rewardRoutes);

// 10. QUẢN LÝ THU CHI CÔNG TY
app.use(
  "/api/company-transactions",
  companyTransactionRoutes
);

// ======================================
// API KHÔNG TỒN TẠI
// ======================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API không tồn tại.",
    path: req.originalUrl,
  });
});

// ======================================
// XỬ LÝ LỖI TOÀN HỆ THỐNG
// ======================================

app.use(errorHandler);

// ======================================
// EXPORT APP
// ======================================

export default app;


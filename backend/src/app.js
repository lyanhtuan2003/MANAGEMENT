
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

// IMPORT ROUTES
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
import profileRoutes from "./routes/profile.routes.js";

import errorHandler from "./middleware/errorHandler.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================
// CORS CONFIGURATION
// ======================================

const normalizeOrigin = (origin) =>
  origin.trim().replace(/\/+$/, "");

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .filter(Boolean),
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .filter(Boolean),
]
  .map(normalizeOrigin)
  .filter((value, index, array) => array.indexOf(value) === index);

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép request không có Origin (server-to-server, health check)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error("CORS blocked origin:", normalizedOrigin);
    return callback(new Error("Origin không được phép truy cập API."));
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

  optionsSuccessStatus: 204,
};

// ======================================
// SECURITY & MIDDLEWARE
// ======================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// CORS phải được xử lý trước khi kết nối database
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(morgan("dev"));

// ======================================
// STATIC UPLOADS
// ======================================

const uploadDirectory = path.resolve(__dirname, "../uploads");

app.use(
  "/uploads",
  express.static(uploadDirectory, {
    setHeaders: (res) => {
      res.setHeader(
        "Cross-Origin-Resource-Policy",
        "cross-origin"
      );
    },
  })
);

// ======================================
// HEALTH CHECK
// ======================================

app.get("/", async (req, res) => {
  try {
    await connectDB();

    return res.status(200).json({
      success: true,
      message: "Internal Management API is running.",
      version: "1.0.0",
      database: "Connected",
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
        "Profile Management",
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
        profiles: "/api/profile",
        companyTransactions: "/api/company-transactions",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể kết nối cơ sở dữ liệu.",
    });
  }
});

// ======================================
// DATABASE CONNECTION FOR API
// ======================================

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể kết nối cơ sở dữ liệu.",
    });
  }
});

// ======================================
// API ROUTES
// ======================================

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/accountants", accountantRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/company-transactions", companyTransactionRoutes);

// ======================================
// 404
// ======================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API không tồn tại.",
    path: req.originalUrl,
  });
});

// ======================================
// ERROR HANDLER
// ======================================

app.use(errorHandler);

export default app;

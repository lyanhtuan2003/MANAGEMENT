
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

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
// ERROR HANDLER
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// ======================================
// CẤU HÌNH THƯ MỤC UPLOAD
// ======================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.js nằm trong backend/src
// Thư mục uploads nằm trong backend/uploads
const uploadDirectory = path.resolve(__dirname, "../uploads");

app.use(
  "/uploads",
  express.static(uploadDirectory, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

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

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
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


app.use(
  cors({
    origin: (origin, callback) => {
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
// MIDDLEWARE REQUEST
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
// XỬ LÝ LỖI
// ======================================

app.use(errorHandler);

export default app;


import express from "express";

import {
  getMyAttendance,
  checkIn,
  checkOut,
  getManagerAttendance,
  updateSchedule,
  getWorkSchedule,
  getManagerAttendanceHistory
} from "../controllers/attendance.controller.js";

import {
  protect,
  authorize,
  authorizeEmployee,
} from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// ======================================
// CHẤM CÔNG CÁ NHÂN
// Nhân viên và kế toán
// ======================================

router.get(
  "/me",
  authorizeEmployee,
  getMyAttendance
);

router.post(
  "/check-in",
  authorizeEmployee,
  checkIn
);

router.patch(
  "/check-out",
  authorizeEmployee,
  checkOut
);

// ======================================
// LỊCH LÀM VIỆC
// Tất cả tài khoản đã đăng nhập được xem
// ======================================

router.get(
  "/schedule",
  authorize("manager", "accountant", "employee"),
  getWorkSchedule
);

// ======================================
// QUẢN LÝ CHẤM CÔNG
// Chỉ quản lý
// ======================================

router.get(
  "/manager",
  authorize("manager"),
  getManagerAttendance
);

router.get(
  "/manager/history",
  authorize("manager"),
  getManagerAttendanceHistory
);

router.put(
  "/schedule",
  authorize("manager"),
  updateSchedule
);

export default router;


import express from "express";

import {
  getMyAttendance,
  checkIn,
  checkOut,
  getManagerAttendance,
  updateSchedule,
  getWorkSchedule,
} from "../controllers/attendance.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// Tất cả API đều yêu cầu đăng nhập
router.use(protect);

// Nhân viên
router.get(
  "/me",
  authorize("employee"),
  getMyAttendance
);

router.post(
  "/check-in",
  authorize("employee"),
  checkIn
);

router.patch(
  "/check-out",
  authorize("employee"),
  checkOut
);

// Lịch làm việc
router.get(
  "/schedule",
  getWorkSchedule
);

// Quản lý
router.get(
  "/manager",
  authorize("manager"),
  getManagerAttendance
);

router.put(
  "/schedule",
  authorize("manager"),
  updateSchedule
);

export default router;

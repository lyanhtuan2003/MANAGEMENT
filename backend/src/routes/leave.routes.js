
import express from "express";

import {
  getMyLeaveRequests,
  createLeaveRequest,
  deleteMyLeaveRequest,
  getAllLeaveRequests,
  reviewLeaveRequest,
} from "../controllers/leave.controller.js";

import {
  protect,
  authorize,
  authorizeEmployee,
} from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// ======================================
// NGHỈ PHÉP CÁ NHÂN
// Nhân viên và kế toán
// ======================================

router.get(
  "/me",
  authorizeEmployee,
  getMyLeaveRequests
);

router.post(
  "/",
  authorizeEmployee,
  createLeaveRequest
);

router.delete(
  "/:id",
  authorizeEmployee,
  deleteMyLeaveRequest
);

// ======================================
// QUẢN LÝ ĐƠN NGHỈ PHÉP
// Chỉ quản lý
// ======================================

router.get(
  "/manager",
  authorize("manager"),
  getAllLeaveRequests
);

router.patch(
  "/:id/review",
  authorize("manager"),
  reviewLeaveRequest
);

export default router;

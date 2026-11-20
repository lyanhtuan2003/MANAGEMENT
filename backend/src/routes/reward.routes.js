
import express from "express";

import {
  getRewardEmployees,
  getManagerRewards,
  createReward,
  updateReward,
  deleteReward,
  getMyRewards,
} from "../controllers/reward.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// ======================================
// NHÂN VIÊN / KẾ TOÁN
// ======================================
router.get(
  "/me",
  authorize("employee", "accountant"),
  getMyRewards
);

// ======================================
// QUẢN LÝ
// ======================================

// Danh sách nhân viên và kế toán được phép thưởng/phạt
router.get(
  "/manager/employees",
  authorize("manager"),
  getRewardEmployees
);

// Danh sách quyết định
router.get(
  "/manager",
  authorize("manager"),
  getManagerRewards
);

// Tạo quyết định
router.post(
  "/manager",
  authorize("manager"),
  createReward
);

// Cập nhật quyết định
router.put(
  "/manager/:id",
  authorize("manager"),
  updateReward
);

// Xóa quyết định
router.delete(
  "/manager/:id",
  authorize("manager"),
  deleteReward
);

export default router;

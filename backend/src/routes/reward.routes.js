
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
// Xem thưởng phạt của chính tài khoản
// ======================================

router.get(
  "/me",
  authorize("employee", "accountant"),
  getMyRewards
);

// ======================================
// QUẢN LÝ THƯỞNG / PHẠT
// QUẢN LÝ VÀ KẾ TOÁN CÓ QUYỀN NHƯ NHAU
// ======================================

// Danh sách nhân viên và kế toán
router.get(
  "/manager/employees",
  authorize("manager", "accountant"),
  getRewardEmployees
);

// Danh sách thưởng phạt toàn công ty
router.get(
  "/manager",
  authorize("manager", "accountant"),
  getManagerRewards
);

// Tạo quyết định thưởng phạt
router.post(
  "/manager",
  authorize("manager", "accountant"),
  createReward
);

// Cập nhật quyết định thưởng phạt
router.put(
  "/manager/:id",
  authorize("manager", "accountant"),
  updateReward
);

// Xóa quyết định thưởng phạt
router.delete(
  "/manager/:id",
  authorize("manager", "accountant"),
  deleteReward
);

export default router;

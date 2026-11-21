
import express from "express";

import {
  createAccountant,
  getAccountants,
  getAccountantById,
  updateAccountant,
  lockAccountant,
  unlockAccountant,
  resetAccountantPassword,
  updateAccountantSalarySettings,
} from "../controllers/employee.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// Chỉ sếp được quản lý tài khoản kế toán
router.use(protect);
router.use(authorize("manager"));

// Tạo tài khoản kế toán
router.post("/", createAccountant);

// Danh sách kế toán
router.get("/", getAccountants);

// Cấp lại mật khẩu
router.patch("/:id/reset-password", resetAccountantPassword);

// Khóa tài khoản
router.patch("/:id/lock", lockAccountant);

// Mở khóa tài khoản
router.patch("/:id/unlock", unlockAccountant);

// Xem chi tiết
router.get("/:id", getAccountantById);

// Cập nhật thông tin
router.put("/:id", updateAccountant);

// Thiết lập lịch lương kế toán
router.patch("/:id/salary-settings", updateAccountantSalarySettings);
export default router;

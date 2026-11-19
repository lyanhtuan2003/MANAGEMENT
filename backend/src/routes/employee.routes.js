
import express from "express";

import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  lockEmployee,
  unlockEmployee,
  resetEmployeePassword,
} from "../controllers/employee.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// ======================================
// XÁC THỰC VÀ PHÂN QUYỀN
// Chỉ Manager được quản lý nhân viên
// ======================================

router.use(protect);
router.use(authorize("manager"));

// ======================================
// QUẢN LÝ NHÂN VIÊN
// ======================================

// Tạo nhân viên
router.post("/", createEmployee);

// Danh sách nhân viên
router.get("/", getEmployees);

// Cấp lại mật khẩu nhân viên
router.patch("/:id/reset-password", resetEmployeePassword);

// Khóa tài khoản nhân viên
router.patch("/:id/lock", lockEmployee);

// Mở khóa tài khoản nhân viên
router.patch("/:id/unlock", unlockEmployee);

// Chi tiết nhân viên
router.get("/:id", getEmployeeById);

// Cập nhật nhân viên
router.put("/:id", updateEmployee);

// Ngừng kích hoạt / cho nghỉ việc
router.delete("/:id", deleteEmployee);

export default router;

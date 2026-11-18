
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

// Tất cả API yêu cầu đăng nhập và quyền quản lý
router.use(protect);
router.use(authorize("manager"));

// Tạo nhân viên
router.post("/", createEmployee);

// Danh sách nhân viên
router.get("/", getEmployees);

// Cấp lại mật khẩu
router.patch("/:id/reset-password", resetEmployeePassword);

// Khóa tài khoản
router.patch("/:id/lock", lockEmployee);

// Mở khóa tài khoản
router.patch("/:id/unlock", unlockEmployee);

// Chi tiết nhân viên
router.get("/:id", getEmployeeById);

// Cập nhật nhân viên
router.put("/:id", updateEmployee);

// Ngừng kích hoạt / cho nghỉ việc
router.delete("/:id", deleteEmployee);

export default router;

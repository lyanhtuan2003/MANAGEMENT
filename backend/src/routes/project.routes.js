
import express from "express";

import {
  getManagerProjects,
  createProject,
  updateProject,
  deleteProject,
  getMyProjects,
} from "../controllers/project.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

const router = express.Router();

// TẤT CẢ API DỰ ÁN ĐỀU YÊU CẦU ĐĂNG NHẬP
router.use(protect);

// ======================================
// NHÂN VIÊN: XEM DỰ ÁN CỦA MÌNH
// GET /api/projects/me
// ======================================
router.get(
  "/me",
  authorize("employee"),
  getMyProjects
);

// ======================================
// QUẢN LÝ: XEM DANH SÁCH DỰ ÁN
// GET /api/projects/manager
// ======================================
router.get(
  "/manager",
  authorize("manager"),
  getManagerProjects
);

// ======================================
// QUẢN LÝ: TẠO DỰ ÁN
// POST /api/projects/manager
// ======================================
router.post(
  "/manager",
  authorize("manager"),
  createProject
);

// ======================================
// QUẢN LÝ: CẬP NHẬT DỰ ÁN
// PUT /api/projects/manager/:id
// ======================================
router.put(
  "/manager/:id",
  authorize("manager"),
  updateProject
);

// ======================================
// QUẢN LÝ: XÓA DỰ ÁN
// DELETE /api/projects/manager/:id
// ======================================
router.delete(
  "/manager/:id",
  authorize("manager"),
  deleteProject
);

export default router;

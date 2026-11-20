
import express from "express";

import {
  getManagerProjects,
  createProject,
  updateProject,
  deleteProject,
  getMyProjects,
  getManagerProjectDetail,
  getMyProjectDetail,
  assignProjectTask,
  updateProjectTask,
  updateMyTaskProgress,
  deleteProjectTask,
  deleteProjectTaskAttachment,
} from "../controllers/project.controller.js";

import {
  protect,
  authorize,
  authorizeEmployee,
} from "../middleware/auth.js";

import projectUpload from "../middleware/projectUpload.js";

const router = express.Router();

router.use(protect);

// ======================================
// NHÂN VIÊN VÀ KẾ TOÁN
// ======================================

// Danh sách dự án được phân công
router.get(
  "/me",
  authorizeEmployee,
  getMyProjects
);

// Chi tiết dự án của bản thân
router.get(
  "/me/:id",
  authorizeEmployee,
  getMyProjectDetail
);

// Cập nhật tiến độ công việc của bản thân
router.patch(
  "/me/:id/tasks/:taskId",
  authorizeEmployee,
  updateMyTaskProgress
);

// ======================================
// QUẢN LÝ
// ======================================

// Danh sách dự án
router.get(
  "/manager",
  authorize("manager"),
  getManagerProjects
);

// Tạo dự án
router.post(
  "/manager",
  authorize("manager"),
  createProject
);

// Chi tiết dự án
router.get(
  "/manager/:id",
  authorize("manager"),
  getManagerProjectDetail
);

// Cập nhật dự án
router.put(
  "/manager/:id",
  authorize("manager"),
  updateProject
);

// Xóa dự án
router.delete(
  "/manager/:id",
  authorize("manager"),
  deleteProject
);

// Phân công công việc, kèm ảnh và tài liệu
router.post(
  "/manager/:id/tasks",
  authorize("manager"),
  projectUpload.array("attachments", 10),
  assignProjectTask
);

// Chỉnh sửa công việc, có thể thêm file
router.put(
  "/manager/:id/tasks/:taskId",
  authorize("manager"),
  projectUpload.array("attachments", 10),
  updateProjectTask
);

// Xóa công việc
router.delete(
  "/manager/:id/tasks/:taskId",
  authorize("manager"),
  deleteProjectTask
);
router.delete(
  "/manager/:id/tasks/:taskId/attachments/:attachmentId",
  authorize("manager"),
  deleteProjectTaskAttachment
);
export default router;

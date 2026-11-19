
import express from "express";

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller.js";

import {
  protect,
  authorizeAll,
} from "../middleware/auth.js";

const router = express.Router();

// Tất cả API thông báo đều yêu cầu đăng nhập
router.use(protect);

// Quản lý, kế toán và nhân viên đều được sử dụng
router.use(authorizeAll);

// Lấy danh sách thông báo của chính mình
router.get("/me", getMyNotifications);

// Đánh dấu tất cả thông báo đã đọc
router.patch("/read-all", markAllNotificationsRead);

// Đánh dấu một thông báo đã đọc
router.patch("/:id/read", markNotificationRead);

export default router;

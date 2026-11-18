
import express from "express";

import {
  login,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

// Đăng nhập
router.post("/login", login);

// Lấy thông tin tài khoản
router.get("/me", protect, getMe);

// Đổi mật khẩu
router.post("/change-password", protect, changePassword);

export default router;

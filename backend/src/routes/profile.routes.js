
import express from "express";

import {
  updateMyBankInfo,
} from "../controllers/profile.controller.js";

import {
  protect,
} from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Nhân viên và kế toán cập nhật tài khoản ngân hàng của chính mình
router.patch("/bank-info", updateMyBankInfo);

export default router;

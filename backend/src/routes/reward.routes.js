
import express from "express";

import {
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

// NHÂN VIÊN
router.get(
  "/me",
  authorize("employee"),
  getMyRewards
);

// QUẢN LÝ
router.get(
  "/manager",
  authorize("manager"),
  getManagerRewards
);

router.post(
  "/manager",
  authorize("manager"),
  createReward
);

router.put(
  "/manager/:id",
  authorize("manager"),
  updateReward
);

router.delete(
  "/manager/:id",
  authorize("manager"),
  deleteReward
);

export default router;

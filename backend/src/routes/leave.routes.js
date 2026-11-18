
import express from "express";

import {
  getMyLeaveRequests,
  createLeaveRequest,
  deleteMyLeaveRequest,
  getAllLeaveRequests,
  reviewLeaveRequest,
} from "../controllers/leave.controller.js";

import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// NHÂN VIÊN
router.get("/me", authorize("employee"), getMyLeaveRequests);
router.post("/", authorize("employee"), createLeaveRequest);
router.delete("/:id", authorize("employee"), deleteMyLeaveRequest);

// SẾP
router.get("/manager", authorize("manager"), getAllLeaveRequests);
router.patch("/:id/review", authorize("manager"), reviewLeaveRequest);

export default router;


import express from "express";

import {
  getManagerPayrolls,
  createPayroll,
  updatePayroll,
  markPayrollPaid,
  deletePayroll,
  getMyPayrolls,
} from "../controllers/payroll.controller.js";

import {
  getPayrollOverview,
  getEmployeePayrollDetail,
} from "../controllers/payrollReport.controller.js";

import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

// Nhân viên chỉ xem bảng lương của chính mình
router.get("/me", authorize("employee"), getMyPayrolls);

// Quản lý
router.get(
  "/manager/overview",
  authorize("manager"),
  getPayrollOverview
);

router.get(
  "/manager/:employeeId/detail",
  authorize("manager"),
  getEmployeePayrollDetail
);

router.get("/manager", authorize("manager"), getManagerPayrolls);
router.post("/manager", authorize("manager"), createPayroll);
router.put("/manager/:id", authorize("manager"), updatePayroll);
router.patch("/manager/:id/pay", authorize("manager"), markPayrollPaid);
router.delete("/manager/:id", authorize("manager"), deletePayroll);

export default router;

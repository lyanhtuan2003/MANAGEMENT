
import express from "express";

import {
  getManagerPayrolls,
  createPayroll,
  createNextPayroll,
  getManagerEmployeePayrollHistory,
  updatePayroll,
  markPayrollPaid,
  deletePayroll,
  getMyPayrolls,
} from "../controllers/payroll.controller.js";

import {
  protect,
  authorize,
  authorizeCompanyFinance,
  authorizeManager,
} from "../middleware/auth.js";

const router = express.Router();

// Bảo vệ tất cả API bảng lương
router.use(protect);

// ========================================
// 1. NHÂN VIÊN / KẾ TOÁN XEM LỊCH SỬ LƯƠNG
// GET /api/payroll/me
// ========================================

router.get(
  "/me",
  authorize("employee", "accountant"),
  getMyPayrolls
);

// ========================================
// 2. QUẢN LÝ / KẾ TOÁN XEM DANH SÁCH LƯƠNG
// GET /api/payroll/manager
// ========================================

router.get(
  "/manager",
  authorizeCompanyFinance,
  getManagerPayrolls
);

// ========================================
// 3. TẠO BẢNG LƯƠNG NHÁP
// POST /api/payroll/manager
// ========================================

router.post(
  "/manager",
  authorizeCompanyFinance,
  createPayroll
);

// ========================================
// 4. TẠO ĐỢT LƯƠNG TIẾP THEO
// POST /api/payroll/manager/:id/next
// ========================================

router.post(
  "/manager/:id/next",
  authorizeCompanyFinance,
  createNextPayroll
);

// ========================================
// 5. XEM LỊCH SỬ LƯƠNG CỦA NHÂN VIÊN
// GET /api/payroll/manager/:employeeId/history
// ========================================

router.get(
  "/manager/:employeeId/history",
  authorizeCompanyFinance,
  getManagerEmployeePayrollHistory
);

// ========================================
// 6. CẬP NHẬT BẢNG LƯƠNG NHÁP
// PUT /api/payroll/manager/:id
// ========================================

router.put(
  "/manager/:id",
  authorizeCompanyFinance,
  updatePayroll
);

// ========================================
// 7. XÁC NHẬN THANH TOÁN
// PATCH /api/payroll/manager/:id/pay
// ========================================

router.patch(
  "/manager/:id/pay",
  authorizeCompanyFinance,
  markPayrollPaid
);

// ========================================
// 8. XÓA BẢNG LƯƠNG NHÁP
// DELETE /api/payroll/manager/:id
// ========================================

router.delete(
  "/manager/:id",
  authorizeManager,
  deletePayroll
);

export default router;


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
  updatePayrollSetting,
} from "../controllers/payrollReport.controller.js";

import {
  protect,
  authorize,
  authorizeCompanyFinance,
  authorizeManager,
} from "../middleware/auth.js";

const router = express.Router();

// =====================================================
// BẢO VỆ TẤT CẢ API BẢNG LƯƠNG
// =====================================================

router.use(protect);

// =====================================================
// 1. NHÂN VIÊN / KẾ TOÁN XEM BẢNG LƯƠNG CỦA MÌNH
// GET /api/payroll/me?month=11&year=2026
// =====================================================

router.get(
  "/me",
  authorize("employee", "accountant"),
  getMyPayrolls
);

// =====================================================
// 2. QUẢN LÝ / KẾ TOÁN XEM TỔNG QUAN
// GET /api/payroll/manager/overview
// =====================================================

router.get(
  "/manager/overview",
  authorizeCompanyFinance,
  getPayrollOverview
);

// =====================================================
// 3. CÀI ĐẶT NGÀY CÔNG CHUẨN
// PUT /api/payroll/manager/setting
// Chỉ quản lý được thay đổi
// =====================================================

router.put(
  "/manager/setting",
  authorizeManager,
  updatePayrollSetting
);

// =====================================================
// 4. XEM CHI TIẾT LƯƠNG NHÂN VIÊN
// GET /api/payroll/manager/:employeeId/detail
// =====================================================

router.get(
  "/manager/:employeeId/detail",
  authorizeCompanyFinance,
  getEmployeePayrollDetail
);

// =====================================================
// 5. DANH SÁCH BẢNG LƯƠNG THEO THÁNG
// GET /api/payroll/manager?month=11&year=2026
// =====================================================

router.get(
  "/manager",
  authorizeCompanyFinance,
  getManagerPayrolls
);

// =====================================================
// 6. TẠO BẢNG LƯƠNG CHO MỘT NHÂN VIÊN
// POST /api/payroll/manager
// =====================================================

router.post(
  "/manager",
  authorizeCompanyFinance,
  createPayroll
);

// =====================================================
// 7. CẬP NHẬT BẢNG LƯƠNG
// PUT /api/payroll/manager/:id
// =====================================================

router.put(
  "/manager/:id",
  authorizeCompanyFinance,
  updatePayroll
);

// =====================================================
// 8. XÁC NHẬN ĐÃ THANH TOÁN
// PATCH /api/payroll/manager/:id/pay
// =====================================================

router.patch(
  "/manager/:id/pay",
  authorizeCompanyFinance,
  markPayrollPaid
);

// =====================================================
// 9. XÓA BẢNG LƯƠNG
// Chỉ quản lý được xóa
// DELETE /api/payroll/manager/:id
// =====================================================

router.delete(
  "/manager/:id",
  authorizeManager,
  deletePayroll
);

export default router;

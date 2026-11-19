import express from "express";

import {
  getTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
} from "../controllers/companyTransaction.controller.js";

import {
  protect,
  authorize,
} from "../middleware/auth.js";

// ========================================
// ROUTER QUẢN LÝ THU CHI CÔNG TY
// ========================================

const router = express.Router();

// ========================================
// KIỂM TRA ĐĂNG NHẬP
// ========================================

// Tất cả API đều yêu cầu token hợp lệ.
router.use(protect);

// ========================================
// PHÂN QUYỀN
// ========================================

// Chỉ quản lý và kế toán được truy cập.
// Nhân viên không được xem dữ liệu tài chính.
router.use(authorize("manager", "accountant"));

// ========================================
// LẤY DANH SÁCH GIAO DỊCH
// GET /api/company-transactions
// ========================================

router.get("/", getTransactions);

// ========================================
// LẤY THỐNG KÊ THU CHI
// GET /api/company-transactions/summary
// ========================================

router.get("/summary", getTransactionSummary);

// ========================================
// THÊM GIAO DỊCH
// POST /api/company-transactions
// ========================================

router.post("/", createTransaction);

// ========================================
// CẬP NHẬT GIAO DỊCH
// PUT /api/company-transactions/:id
// ========================================

router.put("/:id", updateTransaction);

// ========================================
// KHÔNG CHO PHÉP XÓA GIAO DỊCH
// ========================================

// Không khai báo router.delete().
// Quản lý và kế toán chỉ được xem, thêm và sửa.

export default router;
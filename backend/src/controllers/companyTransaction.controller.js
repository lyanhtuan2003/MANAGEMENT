import mongoose from "mongoose";
import CompanyTransaction from "../models/CompanyTransaction.js";

// ========================================
// HÀM TẠO BỘ LỌC NGÀY
// ========================================

const getDateFilter = (query = {}) => {
  const filter = {};

  if (query.from || query.to) {
    filter.transactionDate = {};

    if (query.from) {
      const from = new Date(`${query.from}T00:00:00.000`);

      if (Number.isNaN(from.getTime())) {
        throw new Error("Ngày bắt đầu không hợp lệ.");
      }

      filter.transactionDate.$gte = from;
    }

    if (query.to) {
      const to = new Date(`${query.to}T23:59:59.999`);

      if (Number.isNaN(to.getTime())) {
        throw new Error("Ngày kết thúc không hợp lệ.");
      }

      if (
        filter.transactionDate.$gte &&
        to < filter.transactionDate.$gte
      ) {
        throw new Error("Ngày kết thúc không được trước ngày bắt đầu.");
      }

      filter.transactionDate.$lte = to;
    }
  }

  return filter;
};

// ========================================
// XỬ LÝ TỪ KHÓA TÌM KIẾM
// ========================================

const escapeRegex = (value = "") => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ========================================
// LẤY DANH SÁCH GIAO DỊCH
// GET /api/company-transactions
// ========================================

export const getTransactions = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    if (req.query.type && req.query.type !== "all") {
      if (!["income", "expense"].includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "Loại giao dịch không hợp lệ.",
        });
      }

      filter.type = req.query.type;
    }

    if (req.query.search?.trim()) {
      filter.content = {
        $regex: escapeRegex(req.query.search.trim()),
        $options: "i",
      };
    }

    const transactions = await CompanyTransaction.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      total: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Lỗi getTransactions:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể tải danh sách giao dịch.",
    });
  }
};

// ========================================
// THỐNG KÊ TỔNG THU, TỔNG CHI, SỐ DƯ
// GET /api/company-transactions/summary
// ========================================

export const getTransactionSummary = async (req, res) => {
  try {
    const filter = getDateFilter(req.query);

    const result = await CompanyTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const income = result.find((item) => item._id === "income");
    const expense = result.find((item) => item._id === "expense");

    const totalIncome = income?.total || 0;
    const totalExpense = expense?.total || 0;

    return res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeCount: income?.count || 0,
        expenseCount: expense?.count || 0,
      },
    });
  } catch (error) {
    console.error("Lỗi getTransactionSummary:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Không thể tải thống kê thu chi.",
    });
  }
};

// ========================================
// TẠO GIAO DỊCH
// POST /api/company-transactions
// ========================================

export const createTransaction = async (req, res) => {
  try {
    const { type, content, amount, transactionDate } = req.body;

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn khoản thu hoặc khoản chi.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung giao dịch.",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số tiền phải lớn hơn 0.",
      });
    }

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người tạo giao dịch.",
      });
    }

    const date = transactionDate
      ? new Date(transactionDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Ngày giao dịch không hợp lệ.",
      });
    }

    const transaction = await CompanyTransaction.create({
      type,
      content: content.trim(),
      amount: numericAmount,
      transactionDate: date,
      createdBy: req.user._id,
    });

    const savedTransaction = await CompanyTransaction.findById(
      transaction._id
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Thêm giao dịch thành công.",
      data: savedTransaction,
    });
  } catch (error) {
    console.error("Lỗi createTransaction:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể tạo giao dịch.",
    });
  }
};

// ========================================
// CHỈNH SỬA GIAO DỊCH
// PUT /api/company-transactions/:id
// ========================================

export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, amount, transactionDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã giao dịch không hợp lệ.",
      });
    }

    const transaction = await CompanyTransaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch.",
      });
    }

    if (type !== undefined) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Loại giao dịch không hợp lệ.",
        });
      }

      transaction.type = type;
    }

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Nội dung giao dịch không được để trống.",
        });
      }

      transaction.content = content.trim();
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Số tiền phải lớn hơn 0.",
        });
      }

      transaction.amount = numericAmount;
    }

    if (transactionDate !== undefined) {
      const date = new Date(transactionDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Ngày giao dịch không hợp lệ.",
        });
      }

      transaction.transactionDate = date;
    }

    transaction.updatedBy = req.user._id;

    await transaction.save();

    const updatedTransaction = await CompanyTransaction.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Cập nhật giao dịch thành công.",
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Lỗi updateTransaction:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Không thể cập nhật giao dịch.",
    });
  }
};
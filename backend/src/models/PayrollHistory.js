
import mongoose from "mongoose";

const payrollHistorySchema = new mongoose.Schema(
  {
    // Liên kết với bảng lương đã thanh toán
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      required: true,
      unique: true,
      index: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeCode: {
      type: String,
      default: "",
      trim: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      default: "",
    },

    position: {
      type: String,
      default: "",
    },

    // Giữ lại để tương thích dữ liệu lương cũ.
    // Không sử dụng tháng/năm để tính lương mới.
    month: {
      type: Number,
      default: null,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      default: null,
      min: 2020,
      max: 2100,
    },

    batchNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Ảnh chụp dữ liệu lương tại thời điểm thanh toán
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    allowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    penalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    additionalDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Lưu chi tiết thưởng/phạt đã được tính vào bảng lương
    rewardDetails: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // Thời điểm quản lý xác nhận đã thanh toán
    paidAt: {
      type: Date,
      required: true,
      index: true,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Tra cứu lịch sử lương của từng nhân viên
payrollHistorySchema.index({
  employeeId: 1,
  paidAt: -1,
});

// Tra cứu lịch sử theo thời điểm thanh toán
payrollHistorySchema.index({
  paidAt: -1,
});

const PayrollHistory =
  mongoose.models.PayrollHistory ||
  mongoose.model("PayrollHistory", payrollHistorySchema);

export default PayrollHistory;

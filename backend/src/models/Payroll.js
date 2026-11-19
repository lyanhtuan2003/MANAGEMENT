
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
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

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
    },

    // Lương cơ bản tháng, luôn nhận đủ
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Giữ lại để tương thích dữ liệu cũ.
    // Không dùng để chia lương nữa.
    standardWorkDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
    },

    // Ngày công thực tế, chỉ để thống kê
    workDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Giữ lại để tương thích dữ liệu cũ.
    // Giá trị mới luôn bằng basicSalary.
    proratedBasicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Phụ cấp
    allowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tổng tiền thưởng
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tổng tiền phạt và khấu trừ
    deduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Khấu trừ bổ sung do quản lý nhập
    additionalDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Lương thực nhận
    totalSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["draft", "paid"],
      default: "draft",
    },

    paidAt: {
      type: Date,
      default: null,
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

payrollSchema.index(
  { employeeId: 1, month: 1, year: 1 },
  { unique: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;

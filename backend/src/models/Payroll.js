
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeCode: { type: String, default: "", trim: true },
    employeeName: { type: String, required: true, trim: true },
    department: { type: String, default: "" },
    position: { type: String, default: "" },

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

    basicSalary: { type: Number, required: true, min: 0 },
    allowance: { type: Number, default: 0, min: 0 },

    // Tổng tiền thưởng lấy từ Reward
    bonus: { type: Number, default: 0, min: 0 },

    // Tổng tiền phạt từ Reward + khấu trừ bổ sung
    deduction: { type: Number, default: 0, min: 0 },

    // Phần khấu trừ do Sếp nhập, không bao gồm tiền phạt Reward
    additionalDeduction: { type: Number, default: 0, min: 0 },

    totalSalary: { type: Number, required: true, min: 0 },

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

    paidAt: { type: Date, default: null },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

payrollSchema.index(
  { employeeId: 1, month: 1, year: 1 },
  { unique: true }
);

const Payroll = mongoose.model("Payroll", payrollSchema);

export default Payroll;

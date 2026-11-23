
import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    employeeCode: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["Thưởng", "Phạt"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Số tiền phải lớn hơn 0."],
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // null: chưa được quyết toán trong bảng lương
    // ObjectId: đã được đưa vào bảng lương tương ứng
    payrollBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Các index phục vụ truy vấn thưởng/phạt
rewardSchema.index({ employee: 1, date: -1 });
rewardSchema.index({ type: 1, date: -1 });

// Truy vấn nhanh các khoản chưa quyết toán
rewardSchema.index({ employee: 1, payrollBatchId: 1 });

const Reward =
  mongoose.models.Reward || mongoose.model("Reward", rewardSchema);

export default Reward;

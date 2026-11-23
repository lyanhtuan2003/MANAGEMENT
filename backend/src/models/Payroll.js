
import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    // Nhân viên nhận lương
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
      trim: true,
    },

    position: {
      type: String,
      default: "",
      trim: true,
    },

    // Số thứ tự đợt thanh toán của nhân viên
    batchNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Giữ lại để tương thích dữ liệu bảng lương cũ.
    // Không sử dụng để tạo hoặc tính bảng lương mới.
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

    // Lương cơ bản tại thời điểm tạo bảng lương
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // Phụ cấp
    allowance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tổng tiền thưởng được chụp tại thời điểm tạo bảng lương
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tổng tiền phạt được chụp tại thời điểm tạo bảng lương
    penalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tổng khấu trừ: penalty + additionalDeduction
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

    // Tổng lương thực nhận
    // basicSalary + allowance + bonus - penalty - additionalDeduction
    totalSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    // ID các quyết định thưởng/phạt đã được đưa vào bảng lương
    rewardRecordIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reward",
      },
    ],

    // Snapshot thưởng/phạt tại thời điểm tạo bảng lương
    rewardDetails: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Giữ lại để tương thích dữ liệu chấm công cũ.
    // Không sử dụng trong cách tính lương mới.
    standardWorkDays: {
      type: Number,
      default: 0,
      min: 0,
      max: 31,
    },

    workDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    proratedBasicSalary: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Ghi chú
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // Trạng thái bảng lương
    status: {
      type: String,
      enum: ["draft", "paid"],
      default: "draft",
      index: true,
    },

    // Thời điểm quản lý xác nhận đã chuyển tiền
    paidAt: {
      type: Date,
      default: null,
    },

    // Người xác nhận thanh toán
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

// Chỉ cho phép một bảng lương nháp trên mỗi nhân viên.
// Khi bảng lương cũ được thanh toán, nhân viên có thể tạo đợt mới.
payrollSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "draft",
    },
    name: "one_draft_payroll_per_employee",
  }
);

// Tra cứu lịch sử các đợt lương của nhân viên
payrollSchema.index({
  employeeId: 1,
  paidAt: -1,
});

// Tra cứu bảng lương theo trạng thái và thời gian tạo
payrollSchema.index({
  status: 1,
  createdAt: -1,
});

const Payroll =
  mongoose.models.Payroll ||
  mongoose.model("Payroll", payrollSchema);

export default Payroll;


import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Người nhận thông báo
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Loại thông báo
    type: {
      type: String,
      enum: [
        // Dự án
        "project_assigned",
        "project_updated",

        // Nghỉ phép
        "leave_request",
        "leave_approved",
        "leave_rejected",

        // Chấm công
        "work_schedule_updated",

        // Bảng lương
        "payroll_created",
        "payroll_updated",
        "payroll_paid",

        // Thông báo chung
        "general",
      ],
      default: "general",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Liên kết dự án nếu có
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    // Liên kết đơn nghỉ phép nếu có
    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
      index: true,
    },

    // Liên kết bảng lương nếu có
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      default: null,
      index: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Tối ưu truy vấn thông báo của từng tài khoản
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

// Tối ưu truy vấn thông báo chưa đọc
notificationSchema.index({
  recipient: 1,
  isRead: 1,
});

// Tối ưu truy vấn thông báo theo đơn nghỉ phép
notificationSchema.index({
  leaveRequest: 1,
  type: 1,
});

// Tối ưu truy vấn thông báo theo bảng lương
notificationSchema.index({
  payroll: 1,
  type: 1,
});

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;

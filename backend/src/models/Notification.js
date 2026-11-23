
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "project_assigned",
        "project_updated",
        "leave_request",
        "leave_approved",
        "leave_rejected",
        "work_schedule_updated",
        "payroll_created",
        "payroll_updated",
        "payroll_paid",

        // Thông báo thưởng và phạt
        "reward_created",
        "reward_updated",

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

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    leaveRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
      index: true,
    },

    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payroll",
      default: null,
      index: true,
    },

    // Liên kết quyết định thưởng/phạt
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      default: null,
      index: true,
    },
    rewardType: {
      type: String,
      enum: ["Thưởng", "Phạt"],
      default: null,
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

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ leaveRequest: 1, type: 1 });
notificationSchema.index({ payroll: 1, type: 1 });
notificationSchema.index({ reward: 1, type: 1 });

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;

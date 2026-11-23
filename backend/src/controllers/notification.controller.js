
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

// =====================================================
// 1. LẤY DANH SÁCH THÔNG BÁO CỦA TÀI KHOẢN
// GET /api/notifications/me
// =====================================================

export const getMyNotifications = async (req, res) => {
  try {
    const recipientId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({
        recipient: recipientId,
      })
        .populate("project", "name status progress")
        .populate("leaveRequest", "startDate endDate status")
        .populate("payroll", "month year totalSalary status")
        .populate("reward")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      Notification.countDocuments({
        recipient: recipientId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải thông báo.",
    });
  }
};

// =====================================================
// 2. ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
// PATCH /api/notifications/:id/read
// =====================================================

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID thông báo không hợp lệ.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: recipientId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông báo.",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();

      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc.",
      notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông báo.",
    });
  }
};

// =====================================================
// 3. ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
// PATCH /api/notifications/read-all
// =====================================================

export const markAllNotificationsRead = async (req, res) => {
  try {
    const recipientId = req.user._id;

    const result = await Notification.updateMany(
      {
        recipient: recipientId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Đã đánh dấu tất cả thông báo là đã đọc.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông báo.",
    });
  }
};

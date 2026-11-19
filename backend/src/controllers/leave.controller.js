
import mongoose from "mongoose";

import LeaveRequest from "../models/LeaveRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ========================================
// CẤU HÌNH LOẠI NGHỈ
// ========================================

const allowedTypes = [
  "Nghỉ phép năm",
  "Nghỉ việc riêng",
  "Nghỉ không lương",
  "Nghỉ ốm",
];

// ========================================
// LẤY THÔNG TIN NHÂN VIÊN
// ========================================

const getEmployeeInfo = (user) => ({
  employeeId: user._id,
  employeeName: user.name,
  employeeCode: user.employeeCode || "",
  department: user.department || "",
  position: user.position || "",
});

// ========================================
// ĐỊNH DẠNG NGÀY
// ========================================

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ========================================
// TẠO THÔNG BÁO CHO SẾP
// ========================================

const notifyManagers = async (request) => {
  try {
    const managers = await User.find({
      role: "manager",
      isActive: true,
    }).select("_id");

    if (!managers.length) {
      console.warn(
        "Không tìm thấy tài khoản quản lý để gửi thông báo."
      );
      return;
    }

    const employeeName =
      request.employeeName || "Nhân viên";

    const message =
      `${employeeName} vừa gửi đơn ${request.type}. ` +
      `Thời gian nghỉ: ${formatDate(request.from)} đến ${formatDate(request.to)}. ` +
      `Lý do: ${request.reason}`;

    const notifications = managers.map((manager) => ({
      recipient: manager._id,
      type: "leave_request",
      title: "Có đơn xin nghỉ phép mới",
      message,
      leaveRequest: request._id,
      isRead: false,
    }));

    await Notification.insertMany(notifications);

    console.log(
      `Đã gửi thông báo nghỉ phép đến ${managers.length} quản lý.`
    );
  } catch (error) {
    // Không làm mất đơn nghỉ đã lưu nếu tạo thông báo thất bại
    console.error(
      "Lỗi tạo thông báo cho quản lý:",
      error
    );
  }
};

// ========================================
// TẠO THÔNG BÁO CHO NHÂN VIÊN
// ========================================

const notifyEmployee = async (
  request,
  status,
  managerNote = ""
) => {
  try {
    if (!request.employeeId) {
      console.warn(
        "Không tìm thấy employeeId của đơn nghỉ phép."
      );
      return;
    }

    const isApproved = status === "approved";

    const title = isApproved
      ? "Đơn xin nghỉ phép đã được duyệt"
      : "Đơn xin nghỉ phép đã bị từ chối";

    let message =
      `Đơn ${request.type} của bạn, từ ` +
      `${formatDate(request.from)} đến ${formatDate(request.to)}, ` +
      (isApproved
        ? "đã được quản lý duyệt."
        : "đã bị quản lý từ chối.");

    if (!isApproved && managerNote.trim()) {
      message += ` Lý do từ chối: ${managerNote.trim()}`;
    }

    await Notification.create({
      recipient: request.employeeId,
      type: isApproved
        ? "leave_approved"
        : "leave_rejected",
      title,
      message,
      leaveRequest: request._id,
      isRead: false,
    });

    console.log(
      `Đã gửi thông báo kết quả nghỉ phép cho nhân viên ${request.employeeId}.`
    );
  } catch (error) {
    console.error(
      "Lỗi tạo thông báo cho nhân viên:",
      error
    );
  }
};

// ========================================
// XÓA THÔNG BÁO YÊU CẦU DUYỆT CỦA SẾP
// ========================================

const removeManagerLeaveNotifications = async (
  requestId
) => {
  try {
    const result = await Notification.deleteMany({
      type: "leave_request",
      leaveRequest: requestId,
    });

    console.log(
      `Đã xóa ${result.deletedCount} thông báo yêu cầu duyệt.`
    );

    return result;
  } catch (error) {
    console.error(
      "Lỗi xóa thông báo yêu cầu duyệt:",
      error
    );

    throw error;
  }
};

// ========================================
// NHÂN VIÊN: LẤY ĐƠN CỦA MÌNH
// GET /api/leave/me
// ========================================

export const getMyLeaveRequests = async (
  req,
  res,
  next
) => {
  try {
    const requests = await LeaveRequest.find({
      employeeId: req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// NHÂN VIÊN: TẠO ĐƠN
// POST /api/leave
// ========================================

export const createLeaveRequest = async (
  req,
  res,
  next
) => {
  try {
    const { type, from, to, reason } = req.body;

    // Kiểm tra loại nghỉ
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Loại nghỉ phép không hợp lệ.",
      });
    }

    // Kiểm tra dữ liệu bắt buộc
    if (
      !from ||
      !to ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin.",
      });
    }

    // Kiểm tra độ dài lý do
    if (reason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Lý do nghỉ không được vượt quá 1000 ký tự.",
      });
    }

    // Kiểm tra ngày
    const startDate = new Date(`${from}T00:00:00.000Z`);
    const endDate = new Date(`${to}T00:00:00.000Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày nghỉ không hợp lệ.",
      });
    }

    // Kiểm tra tài khoản
    const user = await User.findById(req.user._id);

    if (
      !user ||
      !user.isActive ||
      user.status === "resigned"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tài khoản không đủ điều kiện gửi đơn.",
      });
    }

    // Lưu đơn nghỉ phép
    const request = await LeaveRequest.create({
      ...getEmployeeInfo(user),
      type,
      from: startDate,
      to: endDate,
      reason: reason.trim(),
      status: "pending",
    });

    // Gửi thông báo đến sếp
    await notifyManagers(request);

    return res.status(201).json({
      success: true,
      message: "Gửi đơn xin nghỉ thành công.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// NHÂN VIÊN: XÓA ĐƠN ĐANG CHỜ DUYỆT
// DELETE /api/leave/:id
// ========================================

export const deleteMyLeaveRequest = async (
  req,
  res,
  next
) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn không hợp lệ.",
      });
    }

    const request = await LeaveRequest.findOne({
      _id: req.params.id,
      employeeId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn xin nghỉ.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Chỉ được xóa đơn đang chờ duyệt.",
      });
    }

    await request.deleteOne();

    // Xóa thông báo yêu cầu duyệt tương ứng
    await removeManagerLeaveNotifications(request._id);

    return res.status(200).json({
      success: true,
      message: "Đã xóa đơn xin nghỉ.",
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// SẾP: LẤY TẤT CẢ ĐƠN
// GET /api/leave/manager
// ========================================

export const getAllLeaveRequests = async (
  req,
  res,
  next
) => {
  try {
    const { status, keyword } = req.query;

    const filter = {};

    if (
      ["pending", "approved", "rejected"].includes(status)
    ) {
      filter.status = status;
    }

    if (keyword?.trim()) {
      const escapedKeyword = keyword
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(escapedKeyword, "i");

      filter.$or = [
        { employeeName: regex },
        { employeeCode: regex },
        { department: regex },
        { reason: regex },
      ];
    }

    const requests = await LeaveRequest.find(filter)
      .populate("reviewedBy", "name employeeCode")
      .sort({
        createdAt: -1,
      });

    const summary = await LeaveRequest.aggregate([
      {
        $group: {
          _id: "$status",
          total: {
            $sum: 1,
          },
        },
      },
    ]);

    const summaryData = {
      pending:
        summary.find(
          (item) => item._id === "pending"
        )?.total || 0,

      approved:
        summary.find(
          (item) => item._id === "approved"
        )?.total || 0,

      rejected:
        summary.find(
          (item) => item._id === "rejected"
        )?.total || 0,

      total: summary.reduce(
        (sum, item) => sum + item.total,
        0
      ),
    };

    return res.status(200).json({
      success: true,
      requests,
      summary: summaryData,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// SẾP: DUYỆT HOẶC TỪ CHỐI
// PATCH /api/leave/:id/review
// ========================================

export const reviewLeaveRequest = async (
  req,
  res,
  next
) => {
  try {
    const {
      status,
      managerNote = "",
    } = req.body;

    // Kiểm tra mã đơn
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn không hợp lệ.",
      });
    }

    // Kiểm tra trạng thái
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái xử lý không hợp lệ.",
      });
    }

    // Kiểm tra ghi chú
    if (
      typeof managerNote !== "string" ||
      managerNote.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Ghi chú không hợp lệ.",
      });
    }

    if (
      status === "rejected" &&
      !managerNote.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối.",
      });
    }

    // Tìm đơn
    const request = await LeaveRequest.findById(
      req.params.id
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn xin nghỉ.",
      });
    }

    // Không cho xử lý lại đơn đã duyệt
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Đơn này đã được xử lý trước đó.",
      });
    }

    // Cập nhật trạng thái
    request.status = status;
    request.managerNote = managerNote.trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    await request.save();

    // Xóa thông báo yêu cầu duyệt của tất cả sếp
    await removeManagerLeaveNotifications(
      request._id
    );

    // Tạo thông báo kết quả cho nhân viên
    await notifyEmployee(
      request,
      status,
      managerNote
    );

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Đã duyệt đơn xin nghỉ."
          : "Đã từ chối đơn xin nghỉ.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

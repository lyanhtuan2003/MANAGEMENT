
import mongoose from "mongoose";
import LeaveRequest from "../models/LeaveRequest.js";
import User from "../models/User.js";

const allowedTypes = [
  "Nghỉ phép năm",
  "Nghỉ việc riêng",
  "Nghỉ không lương",
  "Nghỉ ốm",
];

const getEmployeeInfo = (user) => ({
  employeeId: user._id,
  employeeName: user.name,
  employeeCode: user.employeeCode || "",
  department: user.department || "",
  position: user.position || "",
});

// NHÂN VIÊN: LẤY ĐƠN CỦA MÌNH
export const getMyLeaveRequests = async (req, res, next) => {
  try {
    const requests = await LeaveRequest.find({
      employeeId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// NHÂN VIÊN: TẠO ĐƠN
export const createLeaveRequest = async (req, res, next) => {
  try {
    const { type, from, to, reason } = req.body;

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Loại nghỉ phép không hợp lệ.",
      });
    }

    if (!from || !to || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin.",
      });
    }

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

    if (reason.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Lý do nghỉ không được vượt quá 1000 ký tự.",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user || !user.isActive || user.status === "resigned") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản không đủ điều kiện gửi đơn.",
      });
    }

    const request = await LeaveRequest.create({
      ...getEmployeeInfo(user),
      type,
      from: startDate,
      to: endDate,
      reason: reason.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Gửi đơn xin nghỉ thành công.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

// NHÂN VIÊN: XÓA ĐƠN ĐANG CHỜ DUYỆT
export const deleteMyLeaveRequest = async (req, res, next) => {
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
        message: "Chỉ được xóa đơn đang chờ duyệt.",
      });
    }

    await request.deleteOne();

    return res.json({
      success: true,
      message: "Đã xóa đơn xin nghỉ.",
    });
  } catch (error) {
    next(error);
  }
};

// SẾP: LẤY TẤT CẢ ĐƠN
export const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, keyword } = req.query;

    const filter = {};

    if (["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    if (keyword?.trim()) {
      const regex = new RegExp(
        keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { employeeName: regex },
        { employeeCode: regex },
        { department: regex },
        { reason: regex },
      ];
    }

    const requests = await LeaveRequest.find(filter)
      .populate("reviewedBy", "name employeeCode")
      .sort({ createdAt: -1 });

    const summary = await LeaveRequest.aggregate([
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 },
        },
      },
    ]);

    return res.json({
      success: true,
      requests,
      summary: {
        pending: summary.find((item) => item._id === "pending")?.total || 0,
        approved: summary.find((item) => item._id === "approved")?.total || 0,
        rejected: summary.find((item) => item._id === "rejected")?.total || 0,
        total: summary.reduce((sum, item) => sum + item.total, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// SẾP: DUYỆT HOẶC TỪ CHỐI
export const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { status, managerNote = "" } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn không hợp lệ.",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái xử lý không hợp lệ.",
      });
    }

    if (status === "rejected" && !managerNote.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối.",
      });
    }

    const request = await LeaveRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn xin nghỉ.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Đơn này đã được xử lý trước đó.",
      });
    }

    request.status = status;
    request.managerNote = managerNote.trim();
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();

    await request.save();

    return res.json({
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

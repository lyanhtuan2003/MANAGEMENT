
import mongoose from "mongoose";
import Reward from "../models/Reward.js";
import User from "../models/User.js";

// Lấy thông tin nhân viên hợp lệ
const getEmployee = async (employeeId) => {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return null;
  }

  return User.findOne({
    _id: employeeId,
    role: "employee",
  }).select("name employeeCode department position status isActive");
};

// Kiểm tra ngày
const parseDate = (value) => {
  if (!value) return new Date();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// Chuẩn hóa dữ liệu
const validateRewardData = (body) => {
  const type = String(body.type || "").trim();
  const reason = String(body.reason || "").trim();
  const amount = Number(body.amount);
  const date = parseDate(body.date);

  if (!["Thưởng", "Phạt"].includes(type)) {
    return { error: "Hình thức thưởng phạt không hợp lệ." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Số tiền phải lớn hơn 0." };
  }

  if (!reason) {
    return { error: "Vui lòng nhập lý do." };
  }

  if (reason.length > 1000) {
    return { error: "Lý do không được vượt quá 1000 ký tự." };
  }

  if (!date) {
    return { error: "Ngày áp dụng không hợp lệ." };
  }

  return {
    value: {
      type,
      amount,
      reason,
      date,
    },
  };
};

// ======================================
// QUẢN LÝ: DANH SÁCH THƯỞNG PHẠT
// GET /api/rewards/manager
// ======================================
export const getManagerRewards = async (req, res) => {
  try {
    const { type, employeeId, keyword, from, to } = req.query;

    const filter = {};

    if (type && ["Thưởng", "Phạt"].includes(type)) {
      filter.type = type;
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      filter.employee = employeeId;
    }

    if (keyword) {
      const regex = new RegExp(
        String(keyword).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { employeeName: regex },
        { employeeCode: regex },
        { reason: regex },
      ];
    }

    if (from || to) {
      filter.date = {};

      if (from) {
        const start = parseDate(from);
        if (!start) {
          return res.status(400).json({
            success: false,
            message: "Ngày bắt đầu không hợp lệ.",
          });
        }
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }

      if (to) {
        const end = parseDate(to);
        if (!end) {
          return res.status(400).json({
            success: false,
            message: "Ngày kết thúc không hợp lệ.",
          });
        }
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const records = await Reward.find(filter)
      .populate("employee", "name employeeCode department position")
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 });

    const summary = await Reward.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const rewardSummary = {
      totalReward: 0,
      totalPenalty: 0,
      rewardCount: 0,
      penaltyCount: 0,
      totalRecords: records.length,
    };

    summary.forEach((item) => {
      if (item._id === "Thưởng") {
        rewardSummary.totalReward = item.totalAmount;
        rewardSummary.rewardCount = item.count;
      }

      if (item._id === "Phạt") {
        rewardSummary.totalPenalty = item.totalAmount;
        rewardSummary.penaltyCount = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      records,
      summary: rewardSummary,
    });
  } catch (error) {
    console.error("getManagerRewards:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách thưởng phạt.",
    });
  }
};

// ======================================
// QUẢN LÝ: TẠO QUYẾT ĐỊNH
// POST /api/rewards/manager
// ======================================
export const createReward = async (req, res) => {
  try {
    const { employeeId } = req.body;

    const validation = validateRewardData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const employee = await getEmployee(employeeId);

    if (!employee || !employee.isActive || employee.status === "resigned") {
      return res.status(404).json({
        success: false,
        message: "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
      });
    }

    const record = await Reward.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeCode: employee.employeeCode || "",
      ...validation.value,
      createdBy: req.user._id,
    });

    const populated = await Reward.findById(record._id)
      .populate("employee", "name employeeCode department position")
      .populate("createdBy", "name");

    return res.status(201).json({
      success: true,
      message: "Tạo quyết định thưởng phạt thành công.",
      record: populated,
    });
  } catch (error) {
    console.error("createReward:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo quyết định thưởng phạt.",
    });
  }
};

// ======================================
// QUẢN LÝ: CẬP NHẬT
// PUT /api/rewards/manager/:id
// ======================================
export const updateReward = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã quyết định không hợp lệ.",
      });
    }

    const record = await Reward.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quyết định thưởng phạt.",
      });
    }

    const validation = validateRewardData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const employee = await getEmployee(req.body.employeeId);

    if (!employee || !employee.isActive || employee.status === "resigned") {
      return res.status(404).json({
        success: false,
        message: "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
      });
    }

    record.employee = employee._id;
    record.employeeName = employee.name;
    record.employeeCode = employee.employeeCode || "";
    record.type = validation.value.type;
    record.amount = validation.value.amount;
    record.reason = validation.value.reason;
    record.date = validation.value.date;
    record.updatedBy = req.user._id;

    await record.save();

    const populated = await Reward.findById(record._id)
      .populate("employee", "name employeeCode department position")
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    return res.status(200).json({
      success: true,
      message: "Cập nhật quyết định thành công.",
      record: populated,
    });
  } catch (error) {
    console.error("updateReward:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật quyết định.",
    });
  }
};

// ======================================
// QUẢN LÝ: XÓA QUYẾT ĐỊNH
// DELETE /api/rewards/manager/:id
// ======================================
export const deleteReward = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã quyết định không hợp lệ.",
      });
    }

    const record = await Reward.findByIdAndDelete(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quyết định cần xóa.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Đã xóa quyết định thưởng phạt.",
    });
  } catch (error) {
    console.error("deleteReward:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa quyết định.",
    });
  }
};

// ======================================
// NHÂN VIÊN: LỊCH SỬ CỦA CHÍNH MÌNH
// GET /api/rewards/me
// ======================================
export const getMyRewards = async (req, res) => {
  try {
    const records = await Reward.find({
      employee: req.user._id,
    })
      .sort({ date: -1, createdAt: -1 })
      .select("-createdBy -updatedBy");

    const summary = {
      totalReward: 0,
      totalPenalty: 0,
      rewardCount: 0,
      penaltyCount: 0,
    };

    records.forEach((record) => {
      if (record.type === "Thưởng") {
        summary.totalReward += record.amount;
        summary.rewardCount += 1;
      } else {
        summary.totalPenalty += record.amount;
        summary.penaltyCount += 1;
      }
    });

    return res.status(200).json({
      success: true,
      records,
      summary,
    });
  } catch (error) {
    console.error("getMyRewards:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải lịch sử thưởng phạt.",
    });
  }
};

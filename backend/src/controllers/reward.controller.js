
import mongoose from "mongoose";

import Reward from "../models/Reward.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ACTIVE_ROLES = ["employee", "accountant"];

const INACTIVE_STATUSES = [
  "resigned",
  "inactive",
  "locked",
  "terminated",
];

// ======================================
// GỬI THÔNG BÁO THƯỞNG / PHẠT
// ======================================

const createRewardNotification = async ({
  recipient,
  type,
  title,
  message,
  reward,
  rewardType,
}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      message,
      reward: reward || null,
      rewardType: rewardType || null,
    });
  } catch (error) {
    console.error("Create reward notification error:", error);
  }
};

// ======================================
// KIỂM TRA NHÂN VIÊN / KẾ TOÁN
// ======================================

const getEmployee = async (employeeId) => {
  if (
    !employeeId ||
    !mongoose.Types.ObjectId.isValid(employeeId)
  ) {
    return null;
  }

  return User.findOne({
    _id: employeeId,
    role: { $in: ACTIVE_ROLES },
    isActive: { $ne: false },
    status: { $nin: INACTIVE_STATUSES },
  }).select(
    "name fullName employeeCode department position role status isActive"
  );
};

// ======================================
// CHUYỂN ĐỔI NGÀY
// ======================================

const parseDate = (value) => {
  if (!value) return new Date();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// ======================================
// KIỂM TRA DỮ LIỆU
// ======================================

const validateRewardData = (body) => {
  const type = String(body.type || "").trim();
  const reason = String(body.reason || "").trim();
  const amount = Number(body.amount);
  const date = parseDate(body.date);

  if (!["Thưởng", "Phạt"].includes(type)) {
    return {
      error: "Hình thức thưởng phạt không hợp lệ.",
    };
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return {
      error: "Số tiền phải là số nguyên lớn hơn 0.",
    };
  }

  if (!reason) {
    return {
      error: "Vui lòng nhập lý do.",
    };
  }

  if (reason.length > 1000) {
    return {
      error: "Lý do không được vượt quá 1000 ký tự.",
    };
  }

  if (!date) {
    return {
      error: "Ngày áp dụng không hợp lệ.",
    };
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
// KIỂM TRA ĐÃ QUYẾT TOÁN CHƯA
// ======================================

const isRewardSettled = (record) => {
  return Boolean(record?.payrollBatchId);
};

// ======================================
// QUẢN LÝ: DANH SÁCH NHÂN VIÊN THƯỞNG PHẠT
// GET /api/rewards/manager/employees
// ======================================

export const getRewardEmployees = async (req, res) => {
  try {
    const employees = await User.find({
      role: { $in: ACTIVE_ROLES },
      isActive: { $ne: false },
      status: { $nin: INACTIVE_STATUSES },
    })
      .select(
        "name fullName employeeCode department position role status isActive"
      )
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("getRewardEmployees:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách nhân viên.",
    });
  }
};

// ======================================
// QUẢN LÝ: DANH SÁCH THƯỞNG PHẠT
// GET /api/rewards/manager
// ======================================

export const getManagerRewards = async (req, res) => {
  try {
    const {
      type,
      employeeId,
      keyword,
      from,
      to,
    } = req.query;

    const filter = {};

    if (type && ["Thưởng", "Phạt"].includes(type)) {
      filter.type = type;
    }

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên không hợp lệ.",
        });
      }

      filter.employee = employeeId;
    }

    if (keyword?.trim()) {
      const escapedKeyword = String(keyword)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(escapedKeyword, "i");

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
      .populate(
        "employee",
        "name fullName employeeCode department position role"
      )
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .populate("payrollBatchId", "batchNumber status paidAt")
      .sort({ date: -1, createdAt: -1 });

    const summaryResult = await Reward.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      totalReward: 0,
      totalPenalty: 0,
      rewardCount: 0,
      penaltyCount: 0,
      totalRecords: records.length,
    };

    summaryResult.forEach((item) => {
      if (item._id === "Thưởng") {
        summary.totalReward = item.totalAmount;
        summary.rewardCount = item.count;
      }

      if (item._id === "Phạt") {
        summary.totalPenalty = item.totalAmount;
        summary.penaltyCount = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      records,
      summary,
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

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Nhân viên không tồn tại, đã bị khóa hoặc ngừng hoạt động.",
      });
    }

    const record = await Reward.create({
      employee: employee._id,
      employeeName: employee.name || employee.fullName || "Chưa cập nhật",
      employeeCode: employee.employeeCode || "",
      ...validation.value,
      createdBy: req.user._id,
    });

    const isReward = record.type === "Thưởng";

    await createRewardNotification({
      recipient: employee._id,
      type: "reward_created",

      title: isReward
        ? "Bạn vừa nhận được quyết định thưởng"
        : "Bạn vừa nhận được quyết định phạt",

      message: `${isReward ? "Thưởng" : "Phạt"} ${record.amount.toLocaleString("vi-VN")} VNĐ. Lý do: ${record.reason}`,

      reward: record._id,
      rewardType: record.type,
    });

    const populated = await Reward.findById(record._id)
      .populate(
        "employee",
        "name fullName employeeCode department position role"
      )
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
// QUẢN LÝ: CẬP NHẬT QUYẾT ĐỊNH
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

    // Không cho sửa khoản đã được đưa vào bảng lương.
    if (isRewardSettled(record)) {
      return res.status(400).json({
        success: false,
        message:
          "Khoản thưởng/phạt đã được quyết toán, không thể chỉnh sửa.",
      });
    }

    const previousEmployeeId = String(record.employee);
    const previousRewardType = record.type;

    const validation = validateRewardData(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const employee = await getEmployee(req.body.employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message:
          "Nhân viên không tồn tại, đã bị khóa hoặc ngừng hoạt động.",
      });
    }

    record.employee = employee._id;
    record.employeeName = employee.name || employee.fullName || "Chưa cập nhật";
    record.employeeCode = employee.employeeCode || "";

    record.type = validation.value.type;
    record.amount = validation.value.amount;
    record.reason = validation.value.reason;
    record.date = validation.value.date;

    record.updatedBy = req.user._id;

    await record.save();

    const isReward = record.type === "Thưởng";

    await createRewardNotification({
      recipient: employee._id,
      type: "reward_updated",

      title: isReward
        ? "Quyết định thưởng của bạn đã được cập nhật"
        : "Quyết định phạt của bạn đã được cập nhật",

      message: `${isReward ? "Thưởng" : "Phạt"} ${record.amount.toLocaleString("vi-VN")} VNĐ. Lý do: ${record.reason}`,

      reward: record._id,
      rewardType: record.type,
    });

    // Nếu đổi người nhận, thông báo cho nhân viên cũ.
    if (previousEmployeeId !== String(employee._id)) {
      await createRewardNotification({
        recipient: previousEmployeeId,
        type: "reward_updated",

        title: "Quyết định thưởng/phạt đã được chuyển",

        message:
          "Quyết định thưởng/phạt trước đây của bạn đã được chuyển sang nhân viên khác.",

        reward: null,
        rewardType: previousRewardType,
      });
    }

    const populated = await Reward.findById(record._id)
      .populate(
        "employee",
        "name fullName employeeCode department position role"
      )
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

    const record = await Reward.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quyết định cần xóa.",
      });
    }

    // Không cho xóa khoản đã được đưa vào bảng lương.
    if (isRewardSettled(record)) {
      return res.status(400).json({
        success: false,
        message:
          "Khoản thưởng/phạt đã được quyết toán, không thể xóa.",
      });
    }

    await record.deleteOne();

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
// NHÂN VIÊN / KẾ TOÁN: LỊCH SỬ CỦA MÌNH
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
      } else if (record.type === "Phạt") {
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

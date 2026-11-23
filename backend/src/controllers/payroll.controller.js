
import mongoose from "mongoose";

import Payroll from "../models/Payroll.js";
import PayrollHistory from "../models/PayrollHistory.js";
import Reward from "../models/Reward.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const PAYROLL_ROLES = ["employee", "accountant"];

// ========================================
// HÀM HỖ TRỢ
// ========================================

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const validMoney = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const getEmployeeName = (employee) =>
  employee?.name || employee?.fullName || "Chưa cập nhật";

const getEmployeeCode = (employee) =>
  employee?.employeeCode || employee?.code || "";

const getEmployeeBankInfo = (employee) => ({
  bankName: employee?.bankInfo?.bankName || "",
  accountNumber: employee?.bankInfo?.accountNumber || "",
  accountHolder: employee?.bankInfo?.accountHolder || "",
  branch: employee?.bankInfo?.branch || "",
});

const calculateTotal = ({
  basicSalary,
  allowance,
  bonus,
  penalty,
  additionalDeduction,
}) => {
  return roundMoney(
    Number(basicSalary || 0) +
      Number(allowance || 0) +
      Number(bonus || 0) -
      Number(penalty || 0) -
      Number(additionalDeduction || 0)
  );
};

const getUnsettledRewards = async (employeeId) => {
  return Reward.find({
    employee: employeeId,
    $or: [
      { payrollBatchId: null },
      { payrollBatchId: { $exists: false } },
    ],
  })
    .sort({ date: 1, createdAt: 1 })
    .lean();
};

const summarizeRewards = (records) => {
  let bonus = 0;
  let penalty = 0;

  for (const record of records) {
    const amount = Number(record.amount || 0);

    if (record.type === "Thưởng") bonus += amount;
    if (record.type === "Phạt") penalty += amount;
  }

  return {
    bonus: roundMoney(bonus),
    penalty: roundMoney(penalty),
  };
};

const getActivePayrollEmployees = async () => {
  return User.find({
    role: { $in: PAYROLL_ROLES },
    isActive: { $ne: false },
    status: { $ne: "resigned" },
  })
    .select(
      "name fullName employeeCode code department position salary role isActive status bankInfo"
    )
    .sort({ name: 1 })
    .lean();
};

const getPayrollUser = async (employeeId) => {
  return User.findOne({
    _id: employeeId,
    role: { $in: PAYROLL_ROLES },
    isActive: { $ne: false },
    status: { $ne: "resigned" },
  });
};

const buildRewardDetails = (records) =>
  records.map((record) => ({
    rewardId: record._id,
    type: record.type,
    amount: Number(record.amount || 0),
    reason: record.reason || "",
    date: record.date || null,
    createdAt: record.createdAt || null,
  }));

const buildHistorySnapshot = (payroll) => ({
  payrollId: payroll._id,
  employeeId: payroll.employeeId,
  employeeCode: payroll.employeeCode || "",
  employeeName: payroll.employeeName,
  department: payroll.department || "",
  position: payroll.position || "",

  batchNumber: payroll.batchNumber || 1,

  basicSalary: Number(payroll.basicSalary || 0),
  allowance: Number(payroll.allowance || 0),
  bonus: Number(payroll.bonus || 0),
  penalty: Number(payroll.penalty || 0),
  deduction: Number(payroll.deduction || 0),
  additionalDeduction: Number(payroll.additionalDeduction || 0),
  totalSalary: Number(payroll.totalSalary || 0),

  rewardDetails: payroll.rewardDetails || [],
  note: payroll.note || "",

  paidAt: payroll.paidAt,
  paidBy: payroll.paidBy || null,
});

// ========================================
// 1. QUẢN LÝ: DANH SÁCH BẢNG LƯƠNG
// GET /api/payroll/manager
// ========================================

export const getManagerPayrolls = async (req, res) => {
  try {
    const employees = await getActivePayrollEmployees();

    const employeeIds = employees.map((employee) => employee._id);

    const [drafts, latestPaid, histories] = await Promise.all([
      Payroll.find({
        employeeId: { $in: employeeIds },
        status: "draft",
      }).lean(),

      Payroll.find({
        employeeId: { $in: employeeIds },
        status: "paid",
      })
        .sort({ paidAt: -1 })
        .lean(),

      PayrollHistory.aggregate([
        {
          $match: {
            employeeId: { $in: employeeIds },
          },
        },
        {
          $group: {
            _id: "$employeeId",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const draftMap = new Map(
      drafts.map((item) => [String(item.employeeId), item])
    );

    const paidMap = new Map();

    for (const item of latestPaid) {
      const key = String(item.employeeId);

      if (!paidMap.has(key)) {
        paidMap.set(key, item);
      }
    }

    const historyMap = new Map(
      histories.map((item) => [String(item._id), item.count])
    );

    const rows = await Promise.all(
      employees.map(async (employee) => {
        const id = String(employee._id);
        const draft = draftMap.get(id) || null;
        const lastPaid = paidMap.get(id) || null;

        const unsettledRewards = draft
          ? []
          : await getUnsettledRewards(employee._id);

        const rewardSummary = draft
          ? {
              bonus: Number(draft.bonus || 0),
              penalty: Number(draft.penalty || 0),
            }
          : summarizeRewards(unsettledRewards);

        const basicSalary = draft
          ? Number(draft.basicSalary || 0)
          : Number(employee.salary || 0);

        const allowance = draft
          ? Number(draft.allowance || 0)
          : 0;

        const additionalDeduction = draft
          ? Number(draft.additionalDeduction || 0)
          : 0;

        const penalty = rewardSummary.penalty;
        const bonus = rewardSummary.bonus;

        const totalSalary = draft
          ? Number(draft.totalSalary || 0)
          : calculateTotal({
              basicSalary,
              allowance,
              bonus,
              penalty,
              additionalDeduction,
            });

        return {
          employee: {
            _id: employee._id,
            name: getEmployeeName(employee),
            employeeCode: getEmployeeCode(employee),
            department: employee.department || "",
            position: employee.position || "",
            role: employee.role,
            salary: Number(employee.salary || 0),
            bankInfo: getEmployeeBankInfo(employee),
          },

          payroll: draft,
          lastPaidPayroll: lastPaid,

          basicSalary,
          allowance,
          bonus,
          penalty,
          additionalDeduction,
          deduction: roundMoney(penalty + additionalDeduction),
          totalSalary,

          unsettledRewardCount: draft
            ? (draft.rewardRecordIds || []).length
            : unsettledRewards.length,

          historyCount: historyMap.get(id) || 0,

          status: draft ? "draft" : "not_created",
        };
      })
    );

    const summary = rows.reduce(
      (acc, item) => {
        acc.employeeCount += 1;
        acc.totalDraft += item.status === "draft" ? 1 : 0;
        acc.totalPaidHistory += Number(item.historyCount || 0);

        if (item.status === "draft") {
          acc.unpaidAmount += Number(item.totalSalary || 0);
        }

        return acc;
      },
      {
        employeeCount: 0,
        totalDraft: 0,
        totalPaidHistory: 0,
        unpaidAmount: 0,
      }
    );

    return res.json({
      success: true,
      payrolls: rows,
      summary,
    });
  } catch (error) {
    console.error("getManagerPayrolls:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách bảng lương.",
    });
  }
};

// ========================================
// 2. TẠO BẢNG LƯƠNG NHÁP
// POST /api/payroll/manager
// ========================================

export const createPayroll = async (req, res) => {
  try {
    const { employeeId, allowance = 0, additionalDeduction = 0, note = "" } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    if (!validMoney(allowance) || !validMoney(additionalDeduction)) {
      return res.status(400).json({
        success: false,
        message: "Phụ cấp và khấu trừ phải là số không âm.",
      });
    }

    const employee = await getPayrollUser(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên đang hoạt động.",
      });
    }

    const existingDraft = await Payroll.findOne({
      employeeId: employee._id,
      status: "draft",
    });

    if (existingDraft) {
      return res.status(409).json({
        success: false,
        message: "Nhân viên đã có bảng lương nháp chưa thanh toán.",
        payroll: existingDraft,
      });
    }

    const rewards = await getUnsettledRewards(employee._id);
    const rewardSummary = summarizeRewards(rewards);

    const basicSalary = Number(employee.salary || 0);
    const fullAllowance = Number(allowance);
    const bonus = rewardSummary.bonus;
    const penalty = rewardSummary.penalty;
    const extraDeduction = Number(additionalDeduction);

    const deduction = roundMoney(penalty + extraDeduction);

    const totalSalary = calculateTotal({
      basicSalary,
      allowance: fullAllowance,
      bonus,
      penalty,
      additionalDeduction: extraDeduction,
    });

    if (totalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng lương không thể nhỏ hơn 0.",
      });
    }

    const previousCount = await PayrollHistory.countDocuments({
      employeeId: employee._id,
    });

    const payroll = await Payroll.create({
      employeeId: employee._id,

      employeeCode: getEmployeeCode(employee),
      employeeName: getEmployeeName(employee),
      department: employee.department || "",
      position: employee.position || "",

      batchNumber: previousCount + 1,

      basicSalary,
      allowance: fullAllowance,
      bonus,
      penalty,
      deduction,
      additionalDeduction: extraDeduction,

      totalSalary,

      rewardRecordIds: rewards.map((item) => item._id),
      rewardDetails: buildRewardDetails(rewards),

      note: String(note || "").trim(),
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Đã tạo bảng lương nháp.",
      payroll,
    });
  } catch (error) {
    console.error("createPayroll:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Nhân viên đã có bảng lương nháp chưa thanh toán.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể tạo bảng lương.",
    });
  }
};

// ========================================
// 3. TẠO ĐỢT LƯƠNG TIẾP THEO
// POST /api/payroll/manager/:id/next
// :id là ID bảng lương đã thanh toán
// ========================================

export const createNextPayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bảng lương không hợp lệ.",
      });
    }

    const previousPayroll = await Payroll.findById(id);

    if (!previousPayroll) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng lương trước đó.",
      });
    }

    if (previousPayroll.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể tạo đợt lương tiếp theo sau khi đã thanh toán.",
      });
    }

    return createPayroll(
      {
        ...req,
        body: {
          employeeId: previousPayroll.employeeId,
          allowance: 0,
          additionalDeduction: 0,
          note: "",
        },
      },
      res
    );
  } catch (error) {
    console.error("createNextPayroll:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo đợt lương tiếp theo.",
    });
  }
};

// ========================================
// 4. CẬP NHẬT BẢNG LƯƠNG NHÁP
// PUT /api/payroll/manager/:id
// ========================================

export const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bảng lương không hợp lệ.",
      });
    }

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng lương.",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Bảng lương đã thanh toán, không thể chỉnh sửa.",
      });
    }

    const basicSalary =
      req.body.basicSalary === undefined
        ? Number(payroll.basicSalary || 0)
        : Number(req.body.basicSalary);

    const allowance =
      req.body.allowance === undefined
        ? Number(payroll.allowance || 0)
        : Number(req.body.allowance);

    const additionalDeduction =
      req.body.additionalDeduction === undefined
        ? Number(payroll.additionalDeduction || 0)
        : Number(req.body.additionalDeduction);

    if (
      !validMoney(basicSalary) ||
      !validMoney(allowance) ||
      !validMoney(additionalDeduction)
    ) {
      return res.status(400).json({
        success: false,
        message: "Các khoản tiền phải là số không âm.",
      });
    }

    const bonus = Number(payroll.bonus || 0);
    const penalty = Number(payroll.penalty || 0);

    const deduction = roundMoney(penalty + additionalDeduction);

    const totalSalary = calculateTotal({
      basicSalary,
      allowance,
      bonus,
      penalty,
      additionalDeduction,
    });

    if (totalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng lương không thể nhỏ hơn 0.",
      });
    }

    payroll.basicSalary = basicSalary;
    payroll.allowance = allowance;
    payroll.bonus = bonus;
    payroll.penalty = penalty;
    payroll.deduction = deduction;
    payroll.additionalDeduction = additionalDeduction;
    payroll.totalSalary = totalSalary;

    if (req.body.note !== undefined) {
      payroll.note = String(req.body.note || "").trim();
    }

    await payroll.save();

    return res.json({
      success: true,
      message: "Cập nhật bảng lương thành công.",
      payroll,
    });
  } catch (error) {
    console.error("updatePayroll:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật bảng lương.",
    });
  }
};

// ========================================
// 5. XÁC NHẬN THANH TOÁN
// PATCH /api/payroll/manager/:id/pay
// ========================================

export const markPayrollPaid = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bảng lương không hợp lệ.",
      });
    }

    const payroll = await Payroll.findOneAndUpdate(
      {
        _id: id,
        status: "draft",
      },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          paidBy: req.user?._id || null,
        },
      },
      { new: true }
    );

    if (!payroll) {
      const existed = await Payroll.findById(id);

      if (!existed) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bảng lương.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Bảng lương đã được thanh toán hoặc không còn ở trạng thái nháp.",
      });
    }

    try {
      // Đánh dấu các khoản thưởng/phạt đã được quyết toán.
      // Không xóa bất kỳ bản ghi thưởng/phạt nào.
      const rewardIds = payroll.rewardRecordIds || [];

      if (rewardIds.length > 0) {
        await Reward.updateMany(
          {
            _id: { $in: rewardIds },
            $or: [
              { payrollBatchId: null },
              { payrollBatchId: { $exists: false } },
            ],
          },
          {
            $set: {
              payrollBatchId: payroll._id,
            },
          }
        );
      }

      // Tạo lịch sử thanh toán.
      // payrollId unique giúp tránh tạo lịch sử trùng.
      await PayrollHistory.findOneAndUpdate(
        { payrollId: payroll._id },
        {
          $setOnInsert: buildHistorySnapshot(payroll),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    } catch (saveError) {
      // Nếu lưu lịch sử hoặc quyết toán thưởng/phạt lỗi,
      // trả bảng lương về nháp để quản lý có thể thử lại.
      await Payroll.updateOne(
        {
          _id: payroll._id,
          status: "paid",
          paidAt: payroll.paidAt,
        },
        {
          $set: {
            status: "draft",
            paidAt: null,
            paidBy: null,
          },
        }
      );

      throw saveError;
    }

    // Gửi thông báo, lỗi thông báo không làm mất lịch sử thanh toán.
    try {
      const employee = await User.findById(payroll.employeeId)
        .select("_id name fullName role")
        .lean();

      if (employee) {
        const amount = Number(payroll.totalSalary || 0).toLocaleString(
          "vi-VN"
        );

        await Notification.create({
          recipient: employee._id,
          type: "payroll_paid",
          title: "Bảng lương đã được thanh toán",
          message: `Bảng lương đợt ${payroll.batchNumber || 1} với số tiền ${amount} đ đã được quản lý xác nhận thanh toán.`,
          isRead: false,
        });
      }
    } catch (notificationError) {
      console.error("Lỗi gửi thông báo thanh toán lương:", notificationError);
    }

    return res.json({
      success: true,
      message: "Đã xác nhận thanh toán và lưu lịch sử lương.",
      payroll,
    });
  } catch (error) {
    console.error("markPayrollPaid:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xác nhận thanh toán.",
      error: error.message,
    });
  }
};

// ========================================
// 6. XÓA BẢNG LƯƠNG NHÁP
// DELETE /api/payroll/manager/:id
// ========================================

export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã bảng lương không hợp lệ.",
      });
    }

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng lương.",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa bảng lương đã thanh toán.",
      });
    }

    await payroll.deleteOne();

    // Không xóa thưởng/phạt.
    // Các khoản chưa quyết toán vẫn có thể dùng cho bảng lương sau.

    return res.json({
      success: true,
      message: "Đã xóa bảng lương nháp.",
    });
  } catch (error) {
    console.error("deletePayroll:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa bảng lương.",
    });
  }
};

// ========================================
// 7. QUẢN LÝ: LỊCH SỬ LƯƠNG CỦA NHÂN VIÊN
// GET /api/payroll/manager/:employeeId/history
// ========================================

export const getManagerEmployeePayrollHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    const employee = await User.findById(employeeId)
      .select("_id name fullName employeeCode code department position role")
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    const history = await PayrollHistory.find({ employeeId })
      .populate("paidBy", "name fullName")
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      employee: {
        _id: employee._id,
        name: getEmployeeName(employee),
        employeeCode: getEmployeeCode(employee),
        department: employee.department || "",
        position: employee.position || "",
      },
      history,
    });
  } catch (error) {
    console.error("getManagerEmployeePayrollHistory:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải lịch sử lương nhân viên.",
    });
  }
};

// ========================================
// 8. NHÂN VIÊN / KẾ TOÁN: LỊCH SỬ LƯƠNG CỦA MÌNH
// GET /api/payroll/me
// ========================================

export const getMyPayrolls = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập lại.",
      });
    }

    const role = String(req.user.role || "").toLowerCase();

    if (!PAYROLL_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem lịch sử lương cá nhân.",
      });
    }

    const history = await PayrollHistory.find({
      employeeId: req.user._id,
    })
      .populate("paidBy", "name fullName")
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      payrolls: history,
      history,
      message: history.length
        ? "Đã tải lịch sử thanh toán lương."
        : "Bạn chưa có lịch sử thanh toán lương.",
    });
  } catch (error) {
    console.error("getMyPayrolls:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải lịch sử lương của bạn.",
    });
  }
};

// Tương thích nếu nơi khác vẫn sử dụng tên hàm cũ.
export const getMyPayrollHistory = getMyPayrolls;

export const getManagerPayrollHistory =
  getManagerEmployeePayrollHistory;


import mongoose from "mongoose";
import Payroll from "../models/Payroll.js";
import Attendance from "../models/Attendance.js";
import Reward from "../models/Reward.js";
import User from "../models/User.js";

const validPeriod = (month, year) =>
  Number.isInteger(Number(month)) &&
  Number(month) >= 1 &&
  Number(month) <= 12 &&
  Number.isInteger(Number(year)) &&
  Number(year) >= 2020 &&
  Number(year) <= 2100;

const validMoney = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;

const calculateTotal = (basic, allowance, bonus, deduction) =>
  Number(basic) + Number(allowance) + Number(bonus) - Number(deduction);

const getMonthRange = (month, year) => ({
  start: new Date(Number(year), Number(month) - 1, 1),
  end: new Date(Number(year), Number(month), 1),
});

const getMonthlyRewardTotals = async (month, year) => {
  const { start, end } = getMonthRange(month, year);

  const records = await Reward.find({
    date: { $gte: start, $lt: end },
  }).lean();

  const result = new Map();

  records.forEach((record) => {
    const id = String(record.employee);

    if (!result.has(id)) {
      result.set(id, { bonus: 0, penalty: 0 });
    }

    const item = result.get(id);

    if (record.type === "Thưởng") {
      item.bonus += Number(record.amount || 0);
    }

    if (record.type === "Phạt") {
      item.penalty += Number(record.amount || 0);
    }
  });

  return result;
};

const getAttendanceStats = async (month, year) => {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const records = await Attendance.find({
    date: { $regex: `^${prefix}` },
  }).lean();

  const result = new Map();

  records.forEach((record) => {
    const id = String(record.employeeId);

    if (!result.has(id)) {
      result.set(id, {
        workDays: 0,
        lateCount: 0,
        lateMinutes: 0,
        earlyLeaveCount: 0,
        earlyLeaveMinutes: 0,
      });
    }

    const item = result.get(id);

    if (record.checkIn) item.workDays += 1;

    const late = Number(record.lateMinutes || 0);
    const early = Number(record.earlyLeaveMinutes || 0);

    if (late > 0) {
      item.lateCount += 1;
      item.lateMinutes += late;
    }

    if (early > 0) {
      item.earlyLeaveCount += 1;
      item.earlyLeaveMinutes += early;
    }
  });

  return result;
};

const getMonthlyRows = async (month, year) => {
  const [employees, rewardMap, attendanceMap, payrolls] =
    await Promise.all([
      User.find({
        role: "employee",
        isActive: true,
        status: { $ne: "resigned" },
      }).select(
        "name employeeCode department position salary"
      ).sort({ name: 1 }),

      getMonthlyRewardTotals(month, year),
      getAttendanceStats(month, year),
      Payroll.find({ month, year }).populate("paidBy", "name"),
    ]);

  const payrollMap = new Map(
    payrolls.map((item) => [String(item.employeeId), item])
  );

  return employees.map((employee) => {
    const id = String(employee._id);

    const reward = rewardMap.get(id) || {
      bonus: 0,
      penalty: 0,
    };

    const attendance = attendanceMap.get(id) || {
      workDays: 0,
      lateCount: 0,
      lateMinutes: 0,
      earlyLeaveCount: 0,
      earlyLeaveMinutes: 0,
    };

    const payroll = payrollMap.get(id) || null;

    const basicSalary = payroll
      ? Number(payroll.basicSalary)
      : Number(employee.salary || 0);

    const allowance = Number(payroll?.allowance || 0);
    const additionalDeduction = Number(
      payroll?.additionalDeduction || 0
    );

    const bonus = reward.bonus;
    const penalty = reward.penalty;
    const deduction = penalty + additionalDeduction;

    const totalSalary = calculateTotal(
      basicSalary,
      allowance,
      bonus,
      deduction
    );

    return {
      employee: {
        _id: employee._id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        department: employee.department,
        position: employee.position,
      },
      payroll,
      attendance,
      basicSalary,
      allowance,
      bonus,
      penalty,
      additionalDeduction,
      deduction,
      totalSalary,
      status: payroll?.status || "not_created",
    };
  });
};

// ========================================
// QUẢN LÝ: XEM DANH SÁCH TỔNG HỢP
// GET /api/payroll/manager
// ========================================
export const getManagerPayrolls = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!validPeriod(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Tháng hoặc năm không hợp lệ.",
      });
    }

    const rows = await getMonthlyRows(month, year);

    const summary = rows.reduce(
      (acc, item) => {
        acc.employeeCount += 1;
        acc.totalPayroll += item.totalSalary;
        acc.totalWorkDays += item.attendance.workDays;
        acc.totalBonus += item.bonus;
        acc.totalPenalty += item.penalty;

        if (item.status === "paid") {
          acc.paidAmount += item.totalSalary;
        } else {
          acc.unpaidAmount += item.totalSalary;
        }

        return acc;
      },
      {
        employeeCount: 0,
        totalPayroll: 0,
        totalWorkDays: 0,
        totalBonus: 0,
        totalPenalty: 0,
        paidAmount: 0,
        unpaidAmount: 0,
      }
    );

    return res.json({
      success: true,
      month,
      year,
      payrolls: rows,
      summary,
    });
  } catch (error) {
    console.error("getManagerPayrolls:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải bảng lương.",
    });
  }
};

// ========================================
// QUẢN LÝ: TẠO BẢNG LƯƠNG
// ========================================
export const createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      allowance = 0,
      additionalDeduction = 0,
      note = "",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    if (!validPeriod(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Tháng hoặc năm không hợp lệ.",
      });
    }

    if (
      !validMoney(allowance) ||
      !validMoney(additionalDeduction)
    ) {
      return res.status(400).json({
        success: false,
        message: "Phụ cấp và khấu trừ phải là số không âm.",
      });
    }

    const employee = await User.findOne({
      _id: employeeId,
      role: "employee",
      isActive: true,
      status: { $ne: "resigned" },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên đang hoạt động.",
      });
    }

    const existed = await Payroll.findOne({
      employeeId,
      month: Number(month),
      year: Number(year),
    });

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Bảng lương tháng này đã được tạo.",
      });
    }

    const rewardMap = await getMonthlyRewardTotals(month, year);
    const reward = rewardMap.get(String(employeeId)) || {
      bonus: 0,
      penalty: 0,
    };

    const basicSalary = Number(employee.salary || 0);
    const deduction = reward.penalty + Number(additionalDeduction);

    const totalSalary = calculateTotal(
      basicSalary,
      allowance,
      reward.bonus,
      deduction
    );

    if (totalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng lương không thể nhỏ hơn 0.",
      });
    }

    const payroll = await Payroll.create({
      employeeId: employee._id,
      employeeCode: employee.employeeCode || "",
      employeeName: employee.name,
      department: employee.department || "",
      position: employee.position || "",
      month: Number(month),
      year: Number(year),
      basicSalary,
      allowance: Number(allowance),
      bonus: reward.bonus,
      deduction,
      additionalDeduction: Number(additionalDeduction),
      totalSalary,
      note: String(note || "").trim(),
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Tạo bảng lương thành công.",
      payroll,
    });
  } catch (error) {
    console.error("createPayroll:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bảng lương tháng này đã tồn tại.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể tạo bảng lương.",
    });
  }
};

// ========================================
// QUẢN LÝ: CẬP NHẬT BẢNG LƯƠNG
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

    if (payroll.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Bảng lương đã thanh toán, không thể chỉnh sửa.",
      });
    }

    const basicSalary =
      req.body.basicSalary === undefined
        ? Number(payroll.basicSalary)
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

    // Luôn lấy thưởng/phạt mới nhất từ Reward
    const rewardMap = await getMonthlyRewardTotals(
      payroll.month,
      payroll.year
    );

    const reward = rewardMap.get(String(payroll.employeeId)) || {
      bonus: 0,
      penalty: 0,
    };

    const deduction = reward.penalty + additionalDeduction;

    const totalSalary = calculateTotal(
      basicSalary,
      allowance,
      reward.bonus,
      deduction
    );

    if (totalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng lương không thể nhỏ hơn 0.",
      });
    }

    payroll.basicSalary = basicSalary;
    payroll.allowance = allowance;
    payroll.bonus = reward.bonus;
    payroll.deduction = deduction;
    payroll.additionalDeduction = additionalDeduction;
    payroll.totalSalary = totalSalary;

    if (req.body.note !== undefined) {
      payroll.note = String(req.body.note).trim();
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
// QUẢN LÝ: XÁC NHẬN ĐÃ THANH TOÁN
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

    const payroll = await Payroll.findById(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng lương.",
      });
    }

    if (payroll.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Bảng lương đã được thanh toán.",
      });
    }

    payroll.status = "paid";
    payroll.paidAt = new Date();
    payroll.paidBy = req.user._id;

    await payroll.save();

    return res.json({
      success: true,
      message: "Đã xác nhận thanh toán.",
      payroll,
    });
  } catch (error) {
    console.error("markPayrollPaid:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xác nhận thanh toán.",
    });
  }
};

// ========================================
// QUẢN LÝ: XÓA BẢNG LƯƠNG
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

    if (payroll.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa bảng lương đã thanh toán.",
      });
    }

    await payroll.deleteOne();

    return res.json({
      success: true,
      message: "Đã xóa bảng lương.",
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
// NHÂN VIÊN: CHỈ XEM BẢNG LƯƠNG CỦA MÌNH
// ========================================
export const getMyPayrolls = async (req, res) => {
  try {
    const filter = {
      employeeId: req.user._id,
    };

    if (req.query.month || req.query.year) {
      const month = Number(req.query.month);
      const year = Number(req.query.year);

      if (!validPeriod(month, year)) {
        return res.status(400).json({
          success: false,
          message: "Tháng hoặc năm không hợp lệ.",
        });
      }

      filter.month = month;
      filter.year = year;
    }

    const payrolls = await Payroll.find(filter)
      .sort({ year: -1, month: -1 })
      .lean();

    return res.json({
      success: true,
      payrolls,
    });
  } catch (error) {
    console.error("getMyPayrolls:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải bảng lương.",
    });
  }
};

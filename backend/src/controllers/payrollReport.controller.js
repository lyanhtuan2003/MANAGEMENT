
import mongoose from "mongoose";

import Attendance from "../models/Attendance.js";
import Reward from "../models/Reward.js";
import User from "../models/User.js";
import Payroll from "../models/Payroll.js";
import PayrollSetting from "../models/PayrollSetting.js";

// ========================================
// HÀM DÙNG CHUNG
// ========================================

const validMonth = (value) =>
  typeof value === "string" &&
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

const roundMoney = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;

// Lương cơ bản luôn tính đủ tháng.
const getFullBasicSalary = (basicSalary) =>
  roundMoney(basicSalary);

// Công thức tính lương
const calculateTotalSalary = (
  basicSalary,
  allowance,
  bonus,
  deduction
) => {
  return roundMoney(
    Number(basicSalary || 0) +
      Number(allowance || 0) +
      Number(bonus || 0) -
      Number(deduction || 0)
  );
};

// Khoảng thời gian tháng theo múi giờ Việt Nam UTC+7
const getMonthRange = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = 7 * 60 * 60 * 1000;

  return {
    start: new Date(
      Date.UTC(year, monthNumber - 1, 1) - offset
    ),

    end: new Date(
      Date.UTC(year, monthNumber, 1) - offset
    ),
  };
};

// Dữ liệu chấm công mặc định
const emptyAttendance = () => ({
  workDays: 0,
  lateCount: 0,
  lateMinutes: 0,
  earlyLeaveCount: 0,
  earlyLeaveMinutes: 0,
});

// Dữ liệu thưởng phạt mặc định
const emptyReward = () => ({
  bonus: 0,
  penalty: 0,
  rewardCount: 0,
  penaltyCount: 0,
  records: [],
});

// Thống kê chấm công
const getEmployeeAttendanceSummary = (records = []) => {
  return {
    ...emptyAttendance(),

    workDays: records.filter(
      (record) => Boolean(record.checkIn)
    ).length,

    lateCount: records.filter(
      (record) => Number(record.lateMinutes || 0) > 0
    ).length,

    lateMinutes: records.reduce(
      (sum, record) =>
        sum + Number(record.lateMinutes || 0),
      0
    ),

    earlyLeaveCount: records.filter(
      (record) =>
        Number(record.earlyLeaveMinutes || 0) > 0
    ).length,

    earlyLeaveMinutes: records.reduce(
      (sum, record) =>
        sum + Number(record.earlyLeaveMinutes || 0),
      0
    ),
  };
};

// ========================================
// 1. CÀI ĐẶT NGÀY CÔNG CHUẨN
// PUT /api/payroll/manager/setting
// ========================================

export const updatePayrollSetting = async (req, res) => {
  try {
    const { month, standardWorkDays } = req.body;

    if (!validMonth(month)) {
      return res.status(400).json({
        success: false,
        message: "Tháng cấu hình không hợp lệ. Ví dụ: 2026-11.",
      });
    }

    const days = Number(standardWorkDays);

    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > 31
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày công chuẩn phải từ 1 đến 31.",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    // Không cho thay đổi cấu hình nếu đã tạo bảng lương.
    const existedPayroll = await Payroll.exists({
      month: monthNumber,
      year,
    });

    if (existedPayroll) {
      return res.status(400).json({
        success: false,
        message:
          "Tháng này đã có bảng lương. Không thể thay đổi ngày công chuẩn.",
      });
    }

    const setting = await PayrollSetting.findOneAndUpdate(
      { month },
      {
        $set: {
          standardWorkDays: days,
          updatedBy: req.user._id,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật ngày công chuẩn thành công.",
      setting,
    });
  } catch (error) {
    console.error("updatePayrollSetting:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật ngày công chuẩn.",
    });
  }
};

// ========================================
// 2. TỔNG QUAN BẢNG LƯƠNG
// GET /api/payroll/manager/overview?month=2026-11
// ========================================

export const getPayrollOverview = async (req, res) => {
  try {
    const month = req.query.month;

    if (!validMonth(month)) {
      return res.status(400).json({
        success: false,
        message: "Tháng thống kê không hợp lệ. Ví dụ: 2026-11.",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    const { start, end } = getMonthRange(month);

    const [
      employees,
      attendanceRecords,
      rewardRecords,
      setting,
      payrolls,
    ] = await Promise.all([
      // Nhân viên và kế toán
      User.find({
        role: {
          $in: ["employee", "accountant"],
        },
        isActive: true,
        status: {
          $ne: "resigned",
        },
      })
        .select(
          "name employeeCode department position salary role"
        )
        .sort({ name: 1 })
        .lean(),

      // Chấm công
      Attendance.find({
        date: {
          $regex: `^${month}`,
        },
      })
        .sort({ date: -1 })
        .lean(),

      // Thưởng phạt
      Reward.find({
        date: {
          $gte: start,
          $lt: end,
        },
      })
        .sort({
          date: -1,
          createdAt: -1,
        })
        .lean(),

      // Cấu hình ngày công
      PayrollSetting.findOne({
        month,
      }).lean(),

      // Bảng lương đã tạo
      Payroll.find({
        month: monthNumber,
        year,
      }).lean(),
    ]);

    const currentStandardWorkDays = Number(
      setting?.standardWorkDays || 0
    );

    // ====================================
    // GOM DỮ LIỆU CHẤM CÔNG
    // ====================================

    const attendanceMap = new Map();

    attendanceRecords.forEach((record) => {
      if (!record.employeeId) return;

      const id = String(record.employeeId);

      if (!attendanceMap.has(id)) {
        attendanceMap.set(id, []);
      }

      attendanceMap.get(id).push(record);
    });

    // ====================================
    // GOM DỮ LIỆU THƯỞNG VÀ PHẠT
    // ====================================

    const rewardMap = new Map();

    rewardRecords.forEach((record) => {
      if (!record.employee) return;

      const id = String(record.employee);

      if (!rewardMap.has(id)) {
        rewardMap.set(id, emptyReward());
      }

      const item = rewardMap.get(id);
      const amount = Number(record.amount || 0);

      if (record.type === "Thưởng") {
        item.bonus += amount;
        item.rewardCount += 1;
      }

      if (record.type === "Phạt") {
        item.penalty += amount;
        item.penaltyCount += 1;
      }

      item.records.push(record);
    });

    // ====================================
    // GOM BẢNG LƯƠNG
    // ====================================

    const payrollMap = new Map();

    payrolls.forEach((payroll) => {
      payrollMap.set(
        String(payroll.employeeId),
        payroll
      );
    });

    // ====================================
    // TÍNH LƯƠNG TỪNG NHÂN VIÊN
    // ====================================

    const rows = employees.map((employee) => {
      const id = String(employee._id);

      const employeeAttendanceRecords =
        attendanceMap.get(id) || [];

      const attendance = getEmployeeAttendanceSummary(
        employeeAttendanceRecords
      );

      const reward = rewardMap.get(id) || emptyReward();

      const payroll = payrollMap.get(id) || null;

      // ------------------------------------
      // ĐÃ TẠO BẢNG LƯƠNG
      // ------------------------------------

      if (payroll) {
        const basicSalary = Number(
          payroll.basicSalary ?? employee.salary ?? 0
        );

        const standardWorkDays = Number(
          payroll.standardWorkDays ??
            currentStandardWorkDays
        );

        const workDays = Number(
          payroll.workDays ?? attendance.workDays
        );

        // Không chia lương theo ngày công.
        const proratedBasicSalary =
          getFullBasicSalary(basicSalary);

        const allowance = Number(
          payroll.allowance || 0
        );

        const bonus = Number(
          payroll.bonus || 0
        );

        const additionalDeduction = Number(
          payroll.additionalDeduction || 0
        );

        const deduction = Number(
          payroll.deduction || 0
        );

        const penalty = Math.max(
          0,
          deduction - additionalDeduction
        );

        // Phiếu đã thanh toán giữ nguyên lịch sử.
        // Phiếu nháp tính theo công thức mới.
        const totalSalary =
          payroll.status === "paid"
            ? Number(payroll.totalSalary || 0)
            : Math.max(
                0,
                calculateTotalSalary(
                  basicSalary,
                  allowance,
                  bonus,
                  deduction
                )
              );

        return {
          employee: {
            _id: employee._id,
            name: employee.name,
            employeeCode: employee.employeeCode,
            department: employee.department,
            position: employee.position,
            salary: Number(employee.salary || 0),
            role: employee.role,
          },

          attendance: {
            ...attendance,
            workDays,
          },

          standardWorkDays,
          workDays,

          basicSalary,
          proratedBasicSalary,

          allowance,
          bonus,
          penalty,
          additionalDeduction,
          deduction,

          totalSalary,

          payroll,
          status: payroll.status,

          rewardCount: reward.rewardCount,
          penaltyCount: reward.penaltyCount,
        };
      }

      // ------------------------------------
      // CHƯA TẠO BẢNG LƯƠNG
      // TÍNH LƯƠNG DỰ KIẾN
      // ------------------------------------

      const basicSalary = Number(
        employee.salary || 0
      );

      const workDays = attendance.workDays;

      const proratedBasicSalary =
        getFullBasicSalary(basicSalary);

      const allowance = 0;

      const bonus = roundMoney(reward.bonus);

      const penalty = roundMoney(reward.penalty);

      const additionalDeduction = 0;

      const deduction = penalty;

      const totalSalary = Math.max(
        0,
        calculateTotalSalary(
          basicSalary,
          allowance,
          bonus,
          deduction
        )
      );

      return {
        employee: {
          _id: employee._id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          department: employee.department,
          position: employee.position,
          salary: basicSalary,
          role: employee.role,
        },

        attendance,

        standardWorkDays: currentStandardWorkDays,
        workDays,

        basicSalary,
        proratedBasicSalary,

        allowance,
        bonus,
        penalty,
        additionalDeduction,
        deduction,

        totalSalary,

        payroll: null,
        status: "not_created",

        rewardCount: reward.rewardCount,
        penaltyCount: reward.penaltyCount,
      };
    });

    // ====================================
    // TỔNG HỢP THỐNG KÊ
    // ====================================

    const summary = rows.reduce(
      (result, item) => {
        result.employeeCount += 1;

        result.totalWorkDays += Number(
          item.workDays || 0
        );

        result.totalBonus += Number(
          item.bonus || 0
        );

        result.totalPenalty += Number(
          item.penalty || 0
        );

        result.totalLate += Number(
          item.attendance.lateCount || 0
        );

        result.totalEarlyLeave += Number(
          item.attendance.earlyLeaveCount || 0
        );

        result.totalSalary += Number(
          item.totalSalary || 0
        );

        if (item.status === "paid") {
          result.paidAmount += Number(
            item.totalSalary || 0
          );
        } else if (item.status === "draft") {
          result.unpaidAmount += Number(
            item.totalSalary || 0
          );
        }

        if (item.status === "not_created") {
          result.notCreatedCount += 1;
        }

        return result;
      },
      {
        employeeCount: 0,
        totalWorkDays: 0,
        totalBonus: 0,
        totalPenalty: 0,
        totalLate: 0,
        totalEarlyLeave: 0,
        totalSalary: 0,
        paidAmount: 0,
        unpaidAmount: 0,
        notCreatedCount: 0,
      }
    );

    return res.status(200).json({
      success: true,
      month,
      standardWorkDays: currentStandardWorkDays,
      setting,
      summary,
      employees: rows,
    });
  } catch (error) {
    console.error("getPayrollOverview:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tổng hợp công và bảng lương.",
    });
  }
};

// ========================================
// 3. CHI TIẾT LƯƠNG NHÂN VIÊN
// GET /api/payroll/manager/:employeeId/detail?month=2026-11
// ========================================

export const getEmployeePayrollDetail = async (
  req,
  res
) => {
  try {
    const { employeeId } = req.params;

    const month = req.query.month;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({
        success: false,
        message: "Mã nhân viên không hợp lệ.",
      });
    }

    if (!validMonth(month)) {
      return res.status(400).json({
        success: false,
        message: "Tháng thống kê không hợp lệ.",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    const employee = await User.findOne({
      _id: employeeId,
      role: {
        $in: ["employee", "accountant"],
      },
    }).select(
      "name employeeCode department position salary role"
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    const { start, end } = getMonthRange(month);

    const [
      attendance,
      rewards,
      setting,
      payroll,
    ] = await Promise.all([
      Attendance.find({
        employeeId,
        date: {
          $regex: `^${month}`,
        },
      }).sort({
        date: -1,
      }),

      Reward.find({
        employee: employeeId,
        date: {
          $gte: start,
          $lt: end,
        },
      })
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({
          date: -1,
          createdAt: -1,
        }),

      PayrollSetting.findOne({
        month,
      }).lean(),

      Payroll.findOne({
        employeeId,
        month: monthNumber,
        year,
      }).lean(),
    ]);

    // ====================================
    // THỐNG KÊ CHẤM CÔNG
    // ====================================

    const attendanceSummary =
      getEmployeeAttendanceSummary(attendance);

    const liveWorkDays = attendanceSummary.workDays;

    // ====================================
    // THỐNG KÊ THƯỞNG VÀ PHẠT
    // ====================================

    const totalBonus = rewards
      .filter((item) => item.type === "Thưởng")
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const totalPenalty = rewards
      .filter((item) => item.type === "Phạt")
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    // ====================================
    // TÍNH CÁC KHOẢN LƯƠNG
    // ====================================

    const basicSalary = Number(
      payroll?.basicSalary ??
        employee.salary ??
        0
    );

    const standardWorkDays = Number(
      payroll?.standardWorkDays ??
        setting?.standardWorkDays ??
        0
    );

    const workDays = Number(
      payroll?.workDays ?? liveWorkDays
    );

    // Ngày công chỉ thống kê, không chia lương.
    const proratedBasicSalary =
      getFullBasicSalary(basicSalary);

    const allowance = Number(
      payroll?.allowance || 0
    );

    const bonus = payroll
      ? Number(payroll.bonus || 0)
      : roundMoney(totalBonus);

    const additionalDeduction = Number(
      payroll?.additionalDeduction || 0
    );

    const deduction = payroll
      ? Number(payroll.deduction || 0)
      : roundMoney(
          totalPenalty + additionalDeduction
        );

    const penalty = payroll
      ? Math.max(
          0,
          deduction - additionalDeduction
        )
      : roundMoney(totalPenalty);

    // Phiếu đã thanh toán giữ nguyên lịch sử.
    // Phiếu chưa thanh toán tính theo công thức mới.
    const totalSalary = payroll
      ? payroll.status === "paid"
        ? Number(payroll.totalSalary || 0)
        : Math.max(
            0,
            calculateTotalSalary(
              basicSalary,
              allowance,
              bonus,
              deduction
            )
          )
      : Math.max(
          0,
          calculateTotalSalary(
            basicSalary,
            allowance,
            bonus,
            deduction
          )
        );

    // ====================================
    // TỔNG HỢP CHI TIẾT
    // ====================================

    const summary = {
      workDays,
      standardWorkDays,

      lateCount: attendanceSummary.lateCount,
      lateMinutes: attendanceSummary.lateMinutes,

      earlyLeaveCount:
        attendanceSummary.earlyLeaveCount,

      earlyLeaveMinutes:
        attendanceSummary.earlyLeaveMinutes,

      totalBonus: bonus,
      totalPenalty: penalty,

      basicSalary,
      proratedBasicSalary,

      allowance,
      additionalDeduction,
      deduction,

      totalSalary,
    };

    return res.status(200).json({
      success: true,
      month,

      employee,

      summary,

      payroll,

      attendance,

      rewards,
    });
  } catch (error) {
    console.error("getEmployeePayrollDetail:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết nhân viên.",
    });
  }
};


import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Reward from "../models/Reward.js";
import User from "../models/User.js";

const validMonth = (value) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");

const getMonthRange = (month) => {
  const [year, m] = month.split("-").map(Number);

  return {
    start: new Date(year, m - 1, 1),
    end: new Date(year, m, 1),
  };
};

// ========================================
// TỔNG HỢP CÔNG, THƯỞNG, PHẠT
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

    const { start, end } = getMonthRange(month);
    const prefix = month;

    const [employees, attendanceRecords, rewardRecords] =
      await Promise.all([
        User.find({
          role: "employee",
          isActive: true,
          status: { $ne: "resigned" },
        })
          .select("name employeeCode department position")
          .sort({ name: 1 })
          .lean(),

        Attendance.find({
          date: { $regex: `^${prefix}` },
        })
          .sort({ date: -1 })
          .lean(),

        Reward.find({
          date: { $gte: start, $lt: end },
        })
          .sort({ date: -1, createdAt: -1 })
          .lean(),
      ]);

    const attendanceMap = new Map();
    const rewardMap = new Map();

    attendanceRecords.forEach((record) => {
      const id = String(record.employeeId);

      if (!attendanceMap.has(id)) {
        attendanceMap.set(id, []);
      }

      attendanceMap.get(id).push(record);
    });

    rewardRecords.forEach((record) => {
      const id = String(record.employee);

      if (!rewardMap.has(id)) {
        rewardMap.set(id, {
          bonus: 0,
          penalty: 0,
          rewardCount: 0,
          penaltyCount: 0,
          records: [],
        });
      }

      const item = rewardMap.get(id);

      if (record.type === "Thưởng") {
        item.bonus += Number(record.amount || 0);
        item.rewardCount += 1;
      } else if (record.type === "Phạt") {
        item.penalty += Number(record.amount || 0);
        item.penaltyCount += 1;
      }

      item.records.push(record);
    });

    const rows = employees.map((employee) => {
      const id = String(employee._id);

      const attendance = attendanceMap.get(id) || [];

      const reward = rewardMap.get(id) || {
        bonus: 0,
        penalty: 0,
        rewardCount: 0,
        penaltyCount: 0,
        records: [],
      };

      const workDays = attendance.filter(
        (record) => Boolean(record.checkIn)
      ).length;

      const lateRecords = attendance.filter(
        (record) => Number(record.lateMinutes || 0) > 0
      );

      const earlyRecords = attendance.filter(
        (record) => Number(record.earlyLeaveMinutes || 0) > 0
      );

      return {
        employee,
        attendance: {
          workDays,
          lateCount: lateRecords.length,
          lateMinutes: attendance.reduce(
            (sum, record) => sum + Number(record.lateMinutes || 0),
            0
          ),
          earlyLeaveCount: earlyRecords.length,
          earlyLeaveMinutes: attendance.reduce(
            (sum, record) =>
              sum + Number(record.earlyLeaveMinutes || 0),
            0
          ),
        },
        bonus: reward.bonus,
        penalty: reward.penalty,
        rewardCount: reward.rewardCount,
        penaltyCount: reward.penaltyCount,
      };
    });

    const summary = rows.reduce(
      (result, item) => {
        result.employeeCount += 1;
        result.totalWorkDays += item.attendance.workDays;
        result.totalBonus += item.bonus;
        result.totalPenalty += item.penalty;
        result.totalLate += item.attendance.lateCount;
        result.totalEarlyLeave += item.attendance.earlyLeaveCount;

        return result;
      },
      {
        employeeCount: 0,
        totalWorkDays: 0,
        totalBonus: 0,
        totalPenalty: 0,
        totalLate: 0,
        totalEarlyLeave: 0,
      }
    );

    return res.status(200).json({
      success: true,
      month,
      summary,
      employees: rows,
    });
  } catch (error) {
    console.error("getPayrollOverview:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tổng hợp công và thưởng phạt.",
    });
  }
};

// ========================================
// CHI TIẾT CÔNG, THƯỞNG, PHẠT CỦA NHÂN VIÊN
// GET /api/payroll/manager/:employeeId/detail?month=2026-11
// ========================================
export const getEmployeePayrollDetail = async (req, res) => {
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

    const employee = await User.findOne({
      _id: employeeId,
      role: "employee",
    }).select("name employeeCode department position");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    const { start, end } = getMonthRange(month);

    const [attendance, rewards] = await Promise.all([
      Attendance.find({
        employeeId,
        date: { $regex: `^${month}` },
      }).sort({ date: -1 }),

      Reward.find({
        employee: employeeId,
        date: { $gte: start, $lt: end },
      })
        .populate("createdBy", "name")
        .populate("updatedBy", "name")
        .sort({ date: -1, createdAt: -1 }),
    ]);

    const summary = {
      workDays: attendance.filter((item) => Boolean(item.checkIn)).length,
      lateCount: attendance.filter(
        (item) => Number(item.lateMinutes || 0) > 0
      ).length,
      lateMinutes: attendance.reduce(
        (sum, item) => sum + Number(item.lateMinutes || 0),
        0
      ),
      earlyLeaveCount: attendance.filter(
        (item) => Number(item.earlyLeaveMinutes || 0) > 0
      ).length,
      earlyLeaveMinutes: attendance.reduce(
        (sum, item) => sum + Number(item.earlyLeaveMinutes || 0),
        0
      ),
      totalBonus: rewards
        .filter((item) => item.type === "Thưởng")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      totalPenalty: rewards
        .filter((item) => item.type === "Phạt")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };

    return res.status(200).json({
      success: true,
      month,
      employee,
      summary,
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

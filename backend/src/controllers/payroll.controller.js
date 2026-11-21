
import mongoose from "mongoose";

import Payroll from "../models/Payroll.js";
import PayrollSetting from "../models/PayrollSetting.js";
import Attendance from "../models/Attendance.js";
import Reward from "../models/Reward.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ========================================
// CẤU HÌNH
// ========================================

const PAYROLL_ROLES = ["employee", "accountant"];

// ========================================
// HÀM HỖ TRỢ
// ========================================

const validPeriod = (month, year) =>
  Number.isInteger(Number(month)) &&
  Number(month) >= 1 &&
  Number(month) <= 12 &&
  Number.isInteger(Number(year)) &&
  Number(year) >= 2020 &&
  Number(year) <= 2100;

const validMoney = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const calculateTotal = (
  basicSalary,
  allowance,
  bonus,
  deduction
) =>
  roundMoney(
    Number(basicSalary || 0) +
    Number(allowance || 0) +
    Number(bonus || 0) -
    Number(deduction || 0)
  );

const getMonthKey = (month, year) =>
  `${year}-${String(month).padStart(2, "0")}`;

// Khoảng thời gian tháng theo múi giờ Việt Nam.
const getMonthRange = (month, year) => {
  const start = new Date(
    Date.UTC(Number(year), Number(month) - 1, 1) -
      7 * 60 * 60 * 1000
  );

  const end = new Date(
    Date.UTC(Number(year), Number(month), 1) -
      7 * 60 * 60 * 1000
  );

  return { start, end };
};

const getEmployeeName = (employee) =>
  employee?.name || employee?.fullName || "Chưa cập nhật";

const getEmployeeCode = (employee) =>
  employee?.employeeCode || employee?.code || "";

// Chuẩn hóa thông tin ngân hàng trả về frontend.
const getEmployeeBankInfo = (employee) => ({
  bankName: employee?.bankInfo?.bankName || "",
  accountNumber: employee?.bankInfo?.accountNumber || "",
  accountHolder: employee?.bankInfo?.accountHolder || "",
  branch: employee?.bankInfo?.branch || "",
});

// ========================================
// LẤY THƯỞNG VÀ PHẠT THEO THÁNG
// ========================================

const getMonthlyRewardTotals = async (month, year) => {
  const { start, end } = getMonthRange(month, year);

  const records = await Reward.find({
    date: {
      $gte: start,
      $lt: end,
    },
  }).lean();

  const result = new Map();

  for (const record of records) {
    const employeeId = record.employee
      ? String(record.employee)
      : null;

    if (!employeeId) continue;

    if (!result.has(employeeId)) {
      result.set(employeeId, {
        bonus: 0,
        penalty: 0,
      });
    }

    const item = result.get(employeeId);
    const amount = Number(record.amount || 0);

    if (record.type === "Thưởng") {
      item.bonus += amount;
    }

    if (record.type === "Phạt") {
      item.penalty += amount;
    }
  }

  return result;
};

// ========================================
// THỐNG KÊ CHẤM CÔNG
// CHỈ THỐNG KÊ, KHÔNG CHIA LƯƠNG
// ========================================

const getAttendanceStats = async (month, year) => {
  const prefix = getMonthKey(month, year);

  const records = await Attendance.find({
    date: {
      $regex: `^${prefix}`,
    },
  }).lean();

  const result = new Map();

  for (const record of records) {
    const employeeId = record.employeeId
      ? String(record.employeeId)
      : null;

    if (!employeeId) continue;

    if (!result.has(employeeId)) {
      result.set(employeeId, {
        workDays: 0,
        lateCount: 0,
        lateMinutes: 0,
        earlyLeaveCount: 0,
        earlyLeaveMinutes: 0,
      });
    }

    const item = result.get(employeeId);

    if (record.checkIn) {
      item.workDays += 1;
    }

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
  }

  return result;
};

// ========================================
// LẤY DANH SÁCH NHÂN VIÊN VÀ KẾ TOÁN
// Không loại tài khoản nếu isActive chưa được khai báo.
// LẤY CẢ THÔNG TIN NGÂN HÀNG
// ========================================

const getActivePayrollEmployees = async () => {
  return User.find({
    role: {
      $in: PAYROLL_ROLES,
    },
    isActive: {
      $ne: false,
    },
    status: {
      $ne: "resigned",
    },
  })
    .select(
      "name fullName employeeCode code department position salary role isActive status bankInfo"
    )
    .sort({ name: 1 })
    .lean();
};

// ========================================
// TỔNG HỢP BẢNG LƯƠNG THEO THÁNG
// ========================================

const getMonthlyRows = async (month, year) => {
  const numericMonth = Number(month);
  const numericYear = Number(year);
  const monthKey = getMonthKey(numericMonth, numericYear);

  const [
    employees,
    rewardMap,
    attendanceMap,
    payrolls,
    setting,
  ] = await Promise.all([
    getActivePayrollEmployees(),

    getMonthlyRewardTotals(numericMonth, numericYear),

    getAttendanceStats(numericMonth, numericYear),

    Payroll.find({
      month: numericMonth,
      year: numericYear,
    })
      .populate("paidBy", "name")
      .lean(),

    PayrollSetting.findOne({
      month: monthKey,
    }).lean(),
  ]);

  const payrollMap = new Map(
    payrolls.map((item) => [
      String(item.employeeId),
      item,
    ])
  );

  const rows = employees.map((employee) => {
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

    // ====================================
    // ĐÃ TẠO BẢNG LƯƠNG
    // ====================================

    if (payroll) {
      const basicSalary = Number(payroll.basicSalary || 0);
      const allowance = Number(payroll.allowance || 0);
      const bonus = Number(payroll.bonus || 0);
      const deduction = Number(payroll.deduction || 0);

      const additionalDeduction = Number(
        payroll.additionalDeduction || 0
      );

      const penalty = Math.max(
        0,
        deduction - additionalDeduction
      );

      // Bảng lương đã chốt thì sử dụng số tiền đã lưu.
      const totalSalary = Number(payroll.totalSalary || 0);

      return {
        employee: {
          _id: employee._id,
          name: getEmployeeName(employee),
          employeeCode: getEmployeeCode(employee),
          department: employee.department || "",
          position: employee.position || "",
          role: employee.role,

          // THÔNG TIN NGÂN HÀNG
          bankInfo: getEmployeeBankInfo(employee),
        },

        payroll,
        attendance,

        basicSalary,
        proratedBasicSalary: basicSalary,

        standardWorkDays: Number(
          payroll.standardWorkDays || 0
        ),

        workDays: Number(
          payroll.workDays ?? attendance.workDays
        ),

        allowance,
        bonus,
        penalty,
        additionalDeduction,
        deduction,

        totalSalary,
        status: payroll.status,
      };
    }

    // ====================================
    // CHƯA TẠO BẢNG LƯƠNG
    // CHỈ HIỂN THỊ LƯƠNG DỰ KIẾN CHO QUẢN LÝ
    // ====================================

    const basicSalary = Number(employee.salary || 0);
    const allowance = 0;
    const bonus = roundMoney(reward.bonus);
    const penalty = roundMoney(reward.penalty);
    const additionalDeduction = 0;

    const deduction = penalty;

    const totalSalary = Math.max(
      0,
      calculateTotal(
        basicSalary,
        allowance,
        bonus,
        deduction
      )
    );

    return {
      employee: {
        _id: employee._id,
        name: getEmployeeName(employee),
        employeeCode: getEmployeeCode(employee),
        department: employee.department || "",
        position: employee.position || "",
        role: employee.role,

        // THÔNG TIN NGÂN HÀNG
        bankInfo: getEmployeeBankInfo(employee),
      },

      payroll: null,
      attendance,

      basicSalary,
      proratedBasicSalary: basicSalary,

      standardWorkDays: Number(
        setting?.standardWorkDays || 0
      ),

      workDays: attendance.workDays,

      allowance,
      bonus,
      penalty,
      additionalDeduction,
      deduction,

      totalSalary,
      status: "not_created",
    };
  });

  return {
    rows,
    standardWorkDays: Number(
      setting?.standardWorkDays || 0
    ),
    setting,
  };
};

// ========================================
// 1. QUẢN LÝ: DANH SÁCH BẢNG LƯƠNG
// GET /api/payroll/manager?month=11&year=2026
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

    const {
      rows,
      standardWorkDays,
      setting,
    } = await getMonthlyRows(month, year);

    const summary = rows.reduce(
      (acc, item) => {
        acc.employeeCount += 1;
        acc.totalPayroll += Number(item.totalSalary || 0);
        acc.totalWorkDays += Number(item.workDays || 0);
        acc.totalBonus += Number(item.bonus || 0);
        acc.totalPenalty += Number(item.penalty || 0);

        if (item.status === "paid") {
          acc.paidAmount += Number(item.totalSalary || 0);
        } else if (item.status !== "not_created") {
          acc.unpaidAmount += Number(item.totalSalary || 0);
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

    return res.status(200).json({
      success: true,
      month,
      year,
      standardWorkDays,
      setting,
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
// 2. TẠO BẢNG LƯƠNG
// POST /api/payroll/manager
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

    const numericMonth = Number(month);
    const numericYear = Number(year);

    const employee = await User.findOne({
      _id: employeeId,
      role: {
        $in: PAYROLL_ROLES,
      },
      isActive: {
        $ne: false,
      },
      status: {
        $ne: "resigned",
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên đang hoạt động.",
      });
    }

    const existed = await Payroll.findOne({
      employeeId: employee._id,
      month: numericMonth,
      year: numericYear,
    });

    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Bảng lương tháng này đã được tạo.",
      });
    }

    const [rewardMap, attendanceMap] = await Promise.all([
      getMonthlyRewardTotals(numericMonth, numericYear),
      getAttendanceStats(numericMonth, numericYear),
    ]);

    const reward = rewardMap.get(String(employee._id)) || {
      bonus: 0,
      penalty: 0,
    };

    const attendance = attendanceMap.get(String(employee._id)) || {
      workDays: 0,
    };

    const basicSalary = Number(employee.salary || 0);
    const workDays = Number(attendance.workDays || 0);

    const fullAllowance = Number(allowance);
    const bonus = roundMoney(reward.bonus);
    const penalty = roundMoney(reward.penalty);
    const extraDeduction = Number(additionalDeduction);

    const deduction = roundMoney(
      penalty + extraDeduction
    );

    // Lương cơ bản nhận đủ tháng, không chia ngày công.
    const totalSalary = calculateTotal(
      basicSalary,
      fullAllowance,
      bonus,
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

      employeeCode: getEmployeeCode(employee),
      employeeName: getEmployeeName(employee),
      department: employee.department || "",
      position: employee.position || "",

      month: numericMonth,
      year: numericYear,

      basicSalary,

      standardWorkDays: 0,
      workDays,
      proratedBasicSalary: basicSalary,

      allowance: fullAllowance,
      bonus,
      deduction,
      additionalDeduction: extraDeduction,

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
// 3. CẬP NHẬT BẢNG LƯƠNG
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

    if (payroll.status === "paid") {
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

    const oldPenalty = Math.max(
      0,
      Number(payroll.deduction || 0) -
        Number(payroll.additionalDeduction || 0)
    );

    const bonus = Number(payroll.bonus || 0);

    const deduction = roundMoney(
      oldPenalty + additionalDeduction
    );

    const totalSalary = calculateTotal(
      basicSalary,
      allowance,
      bonus,
      deduction
    );

    if (totalSalary < 0) {
      return res.status(400).json({
        success: false,
        message: "Tổng lương không thể nhỏ hơn 0.",
      });
    }

    payroll.basicSalary = basicSalary;
    payroll.proratedBasicSalary = basicSalary;
    payroll.allowance = allowance;
    payroll.bonus = bonus;
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
// 4. XÁC NHẬN THANH TOÁN
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

    // Chỉ cập nhật trạng thái thanh toán một lần.
    payroll.status = "paid";
    payroll.paidAt = new Date();
    payroll.paidBy = req.user._id;

    await payroll.save();

    // ====================================
    // GỬI THÔNG BÁO CHO NHÂN VIÊN / KẾ TOÁN
    // ====================================

    try {
      if (payroll.employeeId) {
        const employee = await User.findById(payroll.employeeId)
          .select("_id name fullName role")
          .lean();

        if (employee) {
          const amount = Number(
            payroll.totalSalary || 0
          ).toLocaleString("vi-VN");

          await Notification.create({
            recipient: employee._id,
            type: "payroll_paid",
            title: "Lương tháng đã được thanh toán",
            message:
              `Bảng lương tháng ${payroll.month}/${payroll.year} ` +
              `với số tiền ${amount} đ đã được quản lý xác nhận thanh toán.`,
            isRead: false,
          });

          console.log(
            `Đã gửi thông báo thanh toán lương đến ${
              employee.name ||
              employee.fullName ||
              employee._id
            } (${employee.role || "user"}).`
          );
        } else {
          console.warn(
            "Không tìm thấy tài khoản nhận lương để gửi thông báo:",
            String(payroll.employeeId)
          );
        }
      } else {
        console.warn(
          "Bảng lương không có employeeId, không thể gửi thông báo."
        );
      }
    } catch (notificationError) {
      // Không hoàn tác thanh toán nếu riêng thao tác tạo thông báo gặp lỗi.
      console.error(
        "Lỗi gửi thông báo thanh toán lương:",
        notificationError
      );
    }

    return res.json({
      success: true,
      message: "Đã xác nhận thanh toán và gửi thông báo.",
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
// 5. XÓA BẢNG LƯƠNG
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
// 6. NHÂN VIÊN / KẾ TOÁN
// XEM BẢNG LƯƠNG CỦA CHÍNH MÌNH
// GET /api/payroll/me?month=11&year=2026
// ========================================

export const getMyPayrolls = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập lại.",
      });
    }

    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!validPeriod(month, year)) {
      return res.status(400).json({
        success: false,
        message: "Tháng hoặc năm không hợp lệ.",
      });
    }

    const employeeId = req.user._id;

    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    if (!PAYROLL_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem bảng lương cá nhân.",
      });
    }

    // Tìm tài khoản đang đăng nhập.
    const employee = await User.findById(employeeId)
      .select(
        "_id name fullName employeeCode code department position role salary isActive status"
      )
      .lean();

    if (!employee || employee.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản nhân viên.",
      });
    }

    // Chỉ truy vấn đúng ID + tháng + năm.
    const payroll = await Payroll.findOne({
      employeeId: employee._id,
      month,
      year,
    })
      .populate("paidBy", "name")
      .lean();

    if (!payroll) {
      console.warn("KHÔNG TÌM THẤY BẢNG LƯƠNG:", {
        employeeId: String(employee._id),
        employeeName: getEmployeeName(employee),
        employeeCode: getEmployeeCode(employee),
        role,
        month,
        year,
      });

      return res.status(200).json({
        success: true,
        month,
        year,
        payrolls: [],
        message: `Chưa có bảng lương tháng ${month}/${year}.`,
      });
    }

    // Đảm bảo bản ghi trả về đúng tháng/năm yêu cầu.
    if (
      Number(payroll.month) !== month ||
      Number(payroll.year) !== year
    ) {
      return res.status(200).json({
        success: true,
        month,
        year,
        payrolls: [],
        message: "Không có bảng lương trong tháng được chọn.",
      });
    }

    const totalDeduction = Number(payroll.deduction || 0);

    const additionalDeduction = Number(
      payroll.additionalDeduction || 0
    );

    const penalty = Math.max(
      0,
      totalDeduction - additionalDeduction
    );

    const myPayroll = {
      _id: payroll._id,

      employeeId: String(employee._id),

      employeeName:
        getEmployeeName(employee) ||
        payroll.employeeName,

      employeeCode:
        getEmployeeCode(employee) ||
        payroll.employeeCode ||
        "",

      department:
        employee.department ||
        payroll.department ||
        "",

      position:
        employee.position ||
        payroll.position ||
        "",

      month: Number(payroll.month),
      year: Number(payroll.year),

      basicSalary: Number(payroll.basicSalary || 0),
      allowance: Number(payroll.allowance || 0),
      bonus: Number(payroll.bonus || 0),

      penalty,
      additionalDeduction,
      deduction: totalDeduction,

      totalSalary: Number(payroll.totalSalary || 0),

      workDays: Number(payroll.workDays || 0),

      status: payroll.status,

      note: payroll.note || "",

      paidAt: payroll.paidAt || null,
      paidBy: payroll.paidBy || null,
    };

    return res.status(200).json({
      success: true,
      month,
      year,
      payrolls: [myPayroll],
    });
  } catch (error) {
    console.error("getMyPayrolls ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải bảng lương của bạn.",
    });
  }
};


import Attendance from "../models/Attendance.js";
import AttendanceSetting from "../models/AttendanceSetting.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const TIME_ZONE = "Asia/Ho_Chi_Minh";

const DEFAULT_SCHEDULE = {
  startTime: "08:30",
  endTime: "17:30",
};

const STAFF_ROLES = ["employee", "accountant"];

// =====================================================
// LẤY NGÀY GIỜ VIỆT NAM
// =====================================================

const getVietnamDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    timestamp: new Date(),
  };
};

// =====================================================
// CHUYỂN HH:mm THÀNH PHÚT
// =====================================================

const toMinutes = (time) => {
  if (
    typeof time !== "string" ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return null;
  }

  const [hour, minute] = time.split(":").map(Number);

  if (hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

// =====================================================
// TÍNH ĐI MUỘN
// =====================================================

const calculateLate = (checkIn, startTime) => {
  const actual = toMinutes(checkIn);
  const expected = toMinutes(startTime);

  if (actual === null || expected === null) {
    return 0;
  }

  return Math.max(0, actual - expected);
};

// =====================================================
// TÍNH VỀ SỚM
// =====================================================

const calculateEarlyLeave = (checkOut, endTime) => {
  const actual = toMinutes(checkOut);
  const expected = toMinutes(endTime);

  if (actual === null || expected === null) {
    return 0;
  }

  return Math.max(0, expected - actual);
};

// =====================================================
// LẤY LỊCH LÀM VIỆC HIỆN TẠI
// =====================================================

const getSchedule = async () => {
  let setting = await AttendanceSetting.findOne({
    key: "workSchedule",
  });

  if (!setting) {
    setting = await AttendanceSetting.findOneAndUpdate(
      { key: "workSchedule" },
      {
        $setOnInsert: {
          key: "workSchedule",
          ...DEFAULT_SCHEDULE,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  return {
    startTime: setting.startTime || DEFAULT_SCHEDULE.startTime,
    endTime: setting.endTime || DEFAULT_SCHEDULE.endTime,
  };
};

// =====================================================
// KIỂM TRA THÁNG
// =====================================================

const validMonth = (month) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(month || "");

// =====================================================
// LƯU THÔNG TIN NHÂN VIÊN VÀO BẢN GHI
// =====================================================

const employeeSnapshot = (user) => ({
  employeeId: user._id,
  employeeCode: user.employeeCode || "",
  employeeName: user.name || "",
  department: user.department || "",
});

// =====================================================
// KIỂM TRA NHÂN VIÊN VÀ KẾ TOÁN CÓ ĐƯỢC CHẤM CÔNG
// =====================================================

const ensureEmployeeCanAttend = (user, res) => {
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  if (!user || !STAFF_ROLES.includes(role)) {
    res.status(403).json({
      success: false,
      message:
        "Chỉ nhân viên và kế toán mới được sử dụng chức năng chấm công.",
    });

    return false;
  }

  if (user.isActive === false || user.status === "resigned") {
    res.status(403).json({
      success: false,
      message:
        "Tài khoản không hoạt động. Vui lòng liên hệ quản lý.",
    });

    return false;
  }

  return true;
};

// =====================================================
// 1. NHÂN VIÊN VÀ KẾ TOÁN LẤY DỮ LIỆU CHẤM CÔNG
// GET /api/attendance/me
// =====================================================

export const getMyAttendance = async (req, res) => {
  try {
    if (!ensureEmployeeCanAttend(req.user, res)) return;

    const currentDate = getVietnamDateTime().date;

    const selectedMonth =
      req.query.month || currentDate.slice(0, 7);

    if (!validMonth(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: "Tháng chấm công không hợp lệ.",
      });
    }

    const [schedule, records, todayRecord] = await Promise.all([
      getSchedule(),

      Attendance.find({
        employeeId: req.user._id,
        date: {
          $regex: `^${selectedMonth}`,
        },
      }).sort({ date: -1 }),

      Attendance.findOne({
        employeeId: req.user._id,
        date: currentDate,
      }),
    ]);

    return res.status(200).json({
      success: true,
      schedule,
      todayRecord,
      records,
    });
  } catch (error) {
    console.error("Get my attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải dữ liệu chấm công.",
    });
  }
};

// =====================================================
// 2. NHÂN VIÊN VÀ KẾ TOÁN CHẤM CÔNG VÀO
// POST /api/attendance/check-in
// =====================================================

export const checkIn = async (req, res) => {
  try {
    if (!ensureEmployeeCanAttend(req.user, res)) return;

    const now = getVietnamDateTime();
    const schedule = await getSchedule();

    let record = await Attendance.findOne({
      employeeId: req.user._id,
      date: now.date,
    });

    if (record?.checkIn) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã chấm công vào hôm nay.",
      });
    }

    const lateMinutes = calculateLate(
      now.time,
      schedule.startTime
    );

    if (record) {
      record.checkIn = now.time;
      record.checkInAt = now.timestamp;
      record.lateMinutes = lateMinutes;

      Object.assign(record, employeeSnapshot(req.user));

      await record.save();
    } else {
      record = await Attendance.create({
        ...employeeSnapshot(req.user),
        date: now.date,
        checkIn: now.time,
        checkInAt: now.timestamp,
        lateMinutes,
        earlyLeaveMinutes: 0,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        lateMinutes > 0
          ? `Chấm công vào thành công. Bạn đi muộn ${lateMinutes} phút.`
          : "Chấm công vào thành công.",
      record,
    });
  } catch (error) {
    console.error("Check in error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã chấm công hôm nay.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể chấm công vào.",
    });
  }
};

// =====================================================
// 3. NHÂN VIÊN VÀ KẾ TOÁN CHẤM CÔNG RA
// PATCH /api/attendance/check-out
// =====================================================

export const checkOut = async (req, res) => {
  try {
    if (!ensureEmployeeCanAttend(req.user, res)) return;

    const now = getVietnamDateTime();

    const record = await Attendance.findOne({
      employeeId: req.user._id,
      date: now.date,
    });

    if (!record || !record.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa chấm công vào hôm nay.",
      });
    }

    if (record.checkOut) {
      return res.status(409).json({
        success: false,
        message: "Bạn đã chấm công ra hôm nay.",
      });
    }

    const schedule = await getSchedule();

    record.checkOut = now.time;
    record.checkOutAt = now.timestamp;

    record.earlyLeaveMinutes = calculateEarlyLeave(
      now.time,
      schedule.endTime
    );

    await record.save();

    return res.status(200).json({
      success: true,
      message:
        record.earlyLeaveMinutes > 0
          ? `Chấm công ra thành công. Bạn về sớm ${record.earlyLeaveMinutes} phút.`
          : "Chấm công ra thành công.",
      record,
    });
  } catch (error) {
    console.error("Check out error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể chấm công ra.",
    });
  }
};

// =====================================================
// 4. QUẢN LÝ LẤY BẢNG CHẤM CÔNG
// GET /api/attendance/manager
// =====================================================

export const getManagerAttendance = async (req, res) => {
  try {
    const currentMonth = getVietnamDateTime().date.slice(0, 7);

    const selectedMonth =
      req.query.month || currentMonth;

    if (!validMonth(selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: "Tháng chấm công không hợp lệ.",
      });
    }

    const [schedule, employees, records] = await Promise.all([
      getSchedule(),

      User.find({
        role: {
          $in: STAFF_ROLES,
        },
      })
        .select(
          "name email employeeCode department position status isActive role"
        )
        .sort({ name: 1 }),

      Attendance.find({
        date: {
          $regex: `^${selectedMonth}`,
        },
      }).sort({ date: -1 }),
    ]);

    const employeeList = employees.map((employee) => ({
      id: String(employee._id),
      employeeCode: employee.employeeCode || "",
      name: employee.name || "",
      email: employee.email || "",
      department: employee.department || "",
      position: employee.position || "",
      status: employee.status,
      isActive: employee.isActive,
      role: employee.role,
    }));

    // Sử dụng số phút đã lưu trong MongoDB.
    // Không tính lại theo lịch làm việc hiện tại.

    const lateRecords = records.filter(
      (record) => Number(record.lateMinutes || 0) > 0
    );

    const summary = {
      total: employees.length,

      workDays: records.filter(
        (record) => Boolean(record.checkIn)
      ).length,

      lateCount: lateRecords.length,

      lateMinutes: records.reduce(
        (sum, record) =>
          sum + Number(record.lateMinutes || 0),
        0
      ),
    };

    return res.status(200).json({
      success: true,
      month: selectedMonth,
      schedule,
      employees: employeeList,
      records,
      summary,
    });
  } catch (error) {
    console.error("Get manager attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải dữ liệu quản lý chấm công.",
    });
  }
};

// =====================================================
// 5. QUẢN LÝ CẬP NHẬT GIỜ LÀM VIỆC
// PUT /api/attendance/schedule
// =====================================================

export const updateSchedule = async (req, res) => {
  try {
    const { startTime, endTime } = req.body || {};

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (start === null || end === null) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập giờ làm việc hợp lệ theo định dạng HH:mm.",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "Giờ kết thúc phải sau giờ bắt đầu.",
      });
    }

    // Lưu lịch làm việc mới

    const setting = await AttendanceSetting.findOneAndUpdate(
      {
        key: "workSchedule",
      },
      {
        $set: {
          startTime,
          endTime,
        },
        $setOnInsert: {
          key: "workSchedule",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const newSchedule = {
      startTime: setting.startTime,
      endTime: setting.endTime,
    };

    // Gửi thông báo cho nhân viên và kế toán đang hoạt động

    let notificationSent = false;
    let notificationCount = 0;

    try {
      const employees = await User.find({
        role: {
          $in: STAFF_ROLES,
        },
        isActive: true,
        status: {
          $ne: "resigned",
        },
      }).select("_id");

      if (employees.length > 0) {
        const notifications = employees.map((employee) => ({
          recipient: employee._id,
          type: "work_schedule_updated",
          title: "Thông báo thay đổi giờ làm việc",
          message:
            `Quản lý đã cập nhật khung giờ làm việc mới: ` +
            `${newSchedule.startTime} - ${newSchedule.endTime}. ` +
            `Khung giờ mới được áp dụng cho các lượt chấm công phát sinh sau khi cập nhật. ` +
            `Lịch sử chấm công trước đó được giữ nguyên.`,
          isRead: false,
        }));

        const inserted = await Notification.insertMany(
          notifications,
          {
            ordered: false,
          }
        );

        notificationCount = inserted.length;
      }

      notificationSent = true;
    } catch (notificationError) {
      console.error(
        "Send attendance schedule notifications error:",
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      notificationSent,
      notificationCount,
      message: notificationSent
        ? "Cập nhật giờ làm việc thành công. Đã gửi thông báo cho nhân viên và kế toán."
        : "Đã cập nhật giờ làm việc nhưng chưa gửi được thông báo.",
      schedule: newSchedule,
    });
  } catch (error) {
    console.error("Update schedule error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật giờ làm việc.",
    });
  }
};

// =====================================================
// 6. LẤY LỊCH LÀM VIỆC
// GET /api/attendance/schedule
// =====================================================

export const getWorkSchedule = async (req, res) => {
  try {
    const schedule = await getSchedule();

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error("Get work schedule error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch làm việc.",
    });
  }
};

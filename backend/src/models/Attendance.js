
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    // =====================================
    // THÔNG TIN NHÂN VIÊN
    // =====================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    // =====================================
    // NGÀY CHẤM CÔNG
    // =====================================

    date: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================
    // GIỜ LÀM VIỆC ĐƯỢC ÁP DỤNG
    // LƯU CỐ ĐỊNH TẠI THỜI ĐIỂM CHẤM CÔNG
    // =====================================

    scheduledStartTime: {
      type: String,
      default: "",
      trim: true,
    },

    scheduledEndTime: {
      type: String,
      default: "",
      trim: true,
    },

    // =====================================
    // THỜI GIAN CHẤM CÔNG
    // =====================================

    checkIn: {
      type: String,
      default: "",
      trim: true,
    },

    checkOut: {
      type: String,
      default: "",
      trim: true,
    },

    checkInAt: {
      type: Date,
      default: null,
    },

    checkOutAt: {
      type: Date,
      default: null,
    },

    // =====================================
    // KẾT QUẢ ĐI MUỘN / VỀ SỚM
    // LƯU KẾT QUẢ, KHÔNG TỰ TÍNH LẠI
    // KHI QUẢN LÝ ĐỔI LỊCH
    // =====================================

    lateMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    earlyLeaveMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================
    // GHI CHÚ
    // =====================================

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================
// INDEX
// MỖI NHÂN VIÊN CHỈ CÓ 1 BẢN GHI / NGÀY
// =====================================

attendanceSchema.index(
  {
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

// =====================================
// INDEX HỖ TRỢ TRUY VẤN THEO THÁNG
// =====================================

attendanceSchema.index({
  date: 1,
});

// =====================================
// MODEL
// =====================================

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

export default Attendance;

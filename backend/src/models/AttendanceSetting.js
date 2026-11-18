
import mongoose from "mongoose";

const attendanceSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "workSchedule",
      unique: true,
    },

    startTime: {
      type: String,
      default: "08:30",
    },

    endTime: {
      type: String,
      default: "17:30",
    },
  },
  {
    timestamps: true,
  }
);

const AttendanceSetting = mongoose.model(
  "AttendanceSetting",
  attendanceSettingSchema
);

export default AttendanceSetting;


import mongoose from "mongoose";

const payrollSettingSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      unique: true,
      index: true,
    },
    standardWorkDays: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PayrollSetting", payrollSettingSchema);

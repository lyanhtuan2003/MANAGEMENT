
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["manager", "employee"],
      default: "employee",
    },

    position: {
      type: String,
      default: "",
    },

    department: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    salary: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["working", "probation", "resigned"],
      default: "working",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Bắt buộc đổi mật khẩu khi đăng nhập
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Tự động mã hóa mật khẩu trước khi lưu
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// Kiểm tra mật khẩu
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Sinh mã nhân viên
userSchema.statics.generateEmployeeCode = async function () {
  let employeeCode;
  let exists = true;

  while (exists) {
    const randomNumber = crypto.randomInt(100000, 999999);
    employeeCode = `NV${randomNumber}`;

    exists = await this.exists({ employeeCode });
  }

  return employeeCode;
};

// Sinh mật khẩu tạm
userSchema.statics.generateTemporaryPassword = function () {
  return crypto.randomBytes(12).toString("base64url");
};

const User = mongoose.model("User", userSchema);

export default User;

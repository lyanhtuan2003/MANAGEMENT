
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
      enum: ["manager", "accountant", "employee"],
      default: "employee",
      index: true,
    },

    position: {
      type: String,
      default: "",
      trim: true,
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

bankInfo: {
  bankName: {
    type: String,
    default: "",
    trim: true,
    maxlength: 100,
  },

  accountNumber: {
    type: String,
    default: "",
    trim: true,
    maxlength: 50,
  },

  accountHolder: {
    type: String,
    default: "",
    trim: true,
    maxlength: 150,
  },

  branch: {
    type: String,
    default: "",
    trim: true,
    maxlength: 150,
  },
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
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================
// MÃ HÓA MẬT KHẨU
// ======================================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

// ======================================
// KIỂM TRA MẬT KHẨU
// ======================================

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ======================================
// SINH MÃ NHÂN VIÊN
// Dùng chung cho nhân viên và kế toán
// ======================================

userSchema.statics.generateEmployeeCode = async function () {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const employeeCode = `NV${crypto.randomInt(100000, 1000000)}`;

    const exists = await this.exists({ employeeCode });

    if (!exists) return employeeCode;
  }

  throw new Error("Không thể tạo mã nhân viên duy nhất.");
};

// ======================================
// SINH MẬT KHẨU TẠM
// ======================================

userSchema.statics.generateTemporaryPassword = function () {
  return crypto.randomBytes(12).toString("base64url");
};

const User = mongoose.model("User", userSchema);

export default User;

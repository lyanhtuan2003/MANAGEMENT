
import mongoose from "mongoose";
import User from "../models/User.js";

// ==========================================
// CHUẨN HÓA DỮ LIỆU NHÂN VIÊN
// ==========================================

const employeeResponse = (user) => ({
  id: user._id,
  employeeCode: user.employeeCode,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  position: user.position,
  department: user.department,
  salary: user.salary,
  status: user.status,
  role: user.role,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
});

// ==========================================
// KIỂM TRA ID VÀ TÌM NHÂN VIÊN
// ==========================================

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const findEmployee = async (id) => {
  if (!isValidId(id)) return null;

  return User.findOne({
    _id: id,
    role: "employee",
  });
};

// ==========================================
// 1. TẠO TÀI KHOẢN NHÂN VIÊN
// POST /api/employees
// ==========================================

export const createEmployee = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      position,
      department,
      salary,
      status,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên và email nhân viên.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng.",
      });
    }

    if (
      salary !== undefined &&
      (!Number.isFinite(Number(salary)) ||
        Number(salary) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Mức lương không hợp lệ.",
      });
    }

    const validStatuses = ["working", "probation", "resigned"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái nhân viên không hợp lệ.",
      });
    }

    if (status === "resigned") {
      return res.status(400).json({
        success: false,
        message: "Không thể tạo tài khoản với trạng thái đã nghỉ việc.",
      });
    }

    const employeeCode = await User.generateEmployeeCode();
    const temporaryPassword =
      User.generateTemporaryPassword();

    const employee = await User.create({
      employeeCode,
      name: name.trim(),
      email: normalizedEmail,
      password: temporaryPassword,
      phone: phone?.trim() || "",
      position: position?.trim() || "",
      department: department?.trim() || "",
      salary: Number(salary) || 0,
      status: status || "working",
      role: "employee",
      isActive: true,
      mustChangePassword: true,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản nhân viên thành công.",
      employee: employeeResponse(employee),
      credentials: {
        employeeCode,
        email: employee.email,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email hoặc mã nhân viên đã tồn tại.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản nhân viên.",
    });
  }
};

// ==========================================
// 2. LẤY DANH SÁCH NHÂN VIÊN
// GET /api/employees
// ==========================================

export const getEmployees = async (req, res) => {
  try {
    const {
      search = "",
      status,
      department,
      isActive,
    } = req.query;

    const filter = {
      role: "employee",
    };

    if (status) {
      filter.status = status;
    }

    if (department) {
      filter.department = department;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search.trim()) {
      const keyword = search.trim();
      const escapedKeyword = keyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedKeyword, $options: "i" } },
        { email: { $regex: escapedKeyword, $options: "i" } },
        { employeeCode: { $regex: escapedKeyword, $options: "i" } },
        { department: { $regex: escapedKeyword, $options: "i" } },
        { position: { $regex: escapedKeyword, $options: "i" } },
      ];
    }

    const employees = await User.find(filter)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: employees.length,
      employees: employees.map(employeeResponse),
    });
  } catch (error) {
    console.error("Get employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách nhân viên.",
    });
  }
};

// ==========================================
// 3. XEM CHI TIẾT NHÂN VIÊN
// GET /api/employees/:id
// ==========================================

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    return res.status(200).json({
      success: true,
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Get employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin nhân viên.",
    });
  }
};

// ==========================================
// 4. CẬP NHẬT THÔNG TIN NHÂN VIÊN
// PUT /api/employees/:id
// ==========================================

export const updateEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    const {
      name,
      email,
      phone,
      position,
      department,
      salary,
      status,
    } = req.body;

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Email không được để trống.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email đã được tài khoản khác sử dụng.",
        });
      }

      employee.email = normalizedEmail;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống.",
        });
      }

      employee.name = name.trim();
    }

    if (phone !== undefined) {
      employee.phone = String(phone).trim();
    }

    if (position !== undefined) {
      employee.position = String(position).trim();
    }

    if (department !== undefined) {
      employee.department = String(department).trim();
    }

    if (salary !== undefined) {
      if (
        !Number.isFinite(Number(salary)) ||
        Number(salary) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Mức lương không hợp lệ.",
        });
      }

      employee.salary = Number(salary);
    }

    if (status !== undefined) {
      if (!["working", "probation", "resigned"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ.",
        });
      }

      employee.status = status;

      if (status === "resigned") {
        employee.isActive = false;
      }
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật nhân viên thành công.",
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Update employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email đã được tài khoản khác sử dụng.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhân viên.",
    });
  }
};

// ==========================================
// 5. KHÓA TÀI KHOẢN NHÂN VIÊN
// PATCH /api/employees/:id/lock
// ==========================================

export const lockEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    if (employee.status === "resigned") {
      return res.status(400).json({
        success: false,
        message: "Nhân viên này đã nghỉ việc.",
      });
    }

    if (!employee.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đã bị khóa.",
      });
    }

    employee.isActive = false;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Đã khóa tài khoản của ${employee.name}.`,
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Lock employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể khóa tài khoản nhân viên.",
    });
  }
};

// ==========================================
// 6. MỞ KHÓA TÀI KHOẢN NHÂN VIÊN
// PATCH /api/employees/:id/unlock
// ==========================================

export const unlockEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    if (employee.status === "resigned") {
      return res.status(400).json({
        success: false,
        message: "Nhân viên đã nghỉ việc. Không thể mở khóa tài khoản.",
      });
    }

    if (employee.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này hiện đang hoạt động.",
      });
    }

    employee.isActive = true;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Đã mở khóa tài khoản của ${employee.name}.`,
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Unlock employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể mở khóa tài khoản nhân viên.",
    });
  }
};

// ==========================================
// 7. NGỪNG KÍCH HOẠT / CHO NGHỈ VIỆC
// DELETE /api/employees/:id
// ==========================================

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    if (employee.status === "resigned") {
      return res.status(400).json({
        success: false,
        message: "Nhân viên này đã nghỉ việc.",
      });
    }

    employee.isActive = false;
    employee.status = "resigned";

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Đã ngừng kích hoạt tài khoản của ${employee.name}.`,
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể ngừng kích hoạt nhân viên.",
    });
  }
};

// ==========================================
// 8. CẤP LẠI MẬT KHẨU NHÂN VIÊN
// PATCH /api/employees/:id/reset-password
// ==========================================

export const resetEmployeePassword = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    if (!employee.isActive || employee.status === "resigned") {
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhân viên không hoạt động.",
      });
    }

    const temporaryPassword =
      User.generateTemporaryPassword();

    // Gán mật khẩu mới, hook pre-save sẽ mã hóa bằng bcrypt
    employee.password = temporaryPassword;
    employee.mustChangePassword = true;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Đã cấp lại mật khẩu cho ${employee.name}.`,
      credentials: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Reset employee password error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cấp lại mật khẩu nhân viên.",
    });
  }
};

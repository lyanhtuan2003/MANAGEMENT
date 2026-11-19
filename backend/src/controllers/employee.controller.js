
import mongoose from "mongoose";
import User from "../models/User.js";

// ==========================================
// HÀM DÙNG CHUNG
// ==========================================

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  updatedAt: user.updatedAt,
});

const accountantResponse = (user) => ({
  id: user._id,
  _id: user._id,
  employeeCode: user.employeeCode,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  position: user.position,
  department: user.department,
  role: user.role,
  status: user.status,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const findEmployee = async (id) => {
  if (!isValidId(id)) return null;

  return User.findOne({
    _id: id,
    role: "employee",
  });
};

const findAccountant = async (id) => {
  if (!isValidId(id)) return null;

  return User.findOne({
    _id: id,
    role: "accountant",
  });
};

const createTemporaryPassword = () => {
  const password = User.generateTemporaryPassword();

  if (
    typeof password !== "string" ||
    password.length < 6
  ) {
    throw new Error("Không thể tạo mật khẩu tạm thời.");
  }

  return password;
};

const handleDuplicateEmail = (res) =>
  res.status(409).json({
    success: false,
    message: "Email đã được tài khoản khác sử dụng.",
  });

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
      return handleDuplicateEmail(res);
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
        message: "Không thể tạo tài khoản đã nghỉ việc.",
      });
    }

    const employeeCode = await User.generateEmployeeCode();
    const temporaryPassword = createTemporaryPassword();

    const employee = await User.create({
      employeeCode,
      name: name.trim(),
      email: normalizedEmail,
      password: temporaryPassword,
      phone: String(phone || "").trim(),
      position: String(position || "").trim(),
      department: String(department || "").trim(),
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
// 2. DANH SÁCH NHÂN VIÊN
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

    const filter = { role: "employee" };

    if (status) filter.status = status;
    if (department) filter.department = department;

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search.trim()) {
      const keyword = escapeRegex(search.trim());

      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { employeeCode: { $regex: keyword, $options: "i" } },
        { department: { $regex: keyword, $options: "i" } },
        { position: { $regex: keyword, $options: "i" } },
      ];
    }

    const employees = await User.find(filter).sort({
      createdAt: -1,
    });

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
// 3. CHI TIẾT NHÂN VIÊN
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
// 4. CẬP NHẬT NHÂN VIÊN
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

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống.",
        });
      }

      employee.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
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

      if (existingUser) return handleDuplicateEmail(res);

      employee.email = normalizedEmail;
    }

    if (phone !== undefined) employee.phone = String(phone).trim();
    if (position !== undefined) employee.position = String(position).trim();
    if (department !== undefined) employee.department = String(department).trim();

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

    if (error.code === 11000) return handleDuplicateEmail(res);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhân viên.",
    });
  }
};

// ==========================================
// 5. KHÓA NHÂN VIÊN
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

    if (employee.status === "resigned" || !employee.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhân viên không hoạt động.",
      });
    }

    employee.isActive = false;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Đã khóa tài khoản nhân viên.",
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
// 6. MỞ KHÓA NHÂN VIÊN
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

    // Cho phép khôi phục cả tài khoản đã nghỉ việc.
    // Khi mở khóa, tài khoản được kích hoạt và chuyển về đang làm việc.
    employee.isActive = true;
    employee.status = "working";

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Mở khóa tài khoản thành công. Trạng thái đã chuyển về Đang làm việc.",
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
// 7. CHO NHÂN VIÊN NGHỈ VIỆC
// DELETE /api/employees/:id
// Đây là soft delete, không xóa dữ liệu MongoDB
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

    const temporaryPassword = createTemporaryPassword();

    employee.password = temporaryPassword;
    employee.mustChangePassword = true;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Đã cấp lại mật khẩu cho ${employee.name}.`,
      employee: employeeResponse(employee),
      credentials: {
        employeeCode: employee.employeeCode,
        email: employee.email,
        temporaryPassword,
      },
      temporaryPassword,
    });
  } catch (error) {
    console.error("Reset employee password error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cấp lại mật khẩu nhân viên.",
    });
  }
};

// ==========================================
// 9. TẠO TÀI KHOẢN KẾ TOÁN
// POST /api/accountants
// ==========================================

export const createAccountant = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên và email kế toán.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) return handleDuplicateEmail(res);

    const temporaryPassword = createTemporaryPassword();

    const accountant = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: temporaryPassword,
      phone: String(phone || "").trim(),
      position: "Kế toán",
      department: "Kế toán",
      role: "accountant",
      isActive: true,
      mustChangePassword: true,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản kế toán thành công.",
      accountant: accountantResponse(accountant),
      credentials: {
        email: accountant.email,
        temporaryPassword,
      },
      temporaryPassword,
    });
  } catch (error) {
    console.error("Create accountant error:", error);

    if (error.code === 11000) return handleDuplicateEmail(res);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản kế toán.",
    });
  }
};

// ==========================================
// 10. DANH SÁCH KẾ TOÁN
// GET /api/accountants
// ==========================================

export const getAccountants = async (req, res) => {
  try {
    const { search = "", isActive } = req.query;

    const filter = { role: "accountant" };

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search.trim()) {
      const keyword = escapeRegex(search.trim());

      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { phone: { $regex: keyword, $options: "i" } },
        { employeeCode: { $regex: keyword, $options: "i" } },
      ];
    }

    const accountants = await User.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      total: accountants.length,
      accountants: accountants.map(accountantResponse),
    });
  } catch (error) {
    console.error("Get accountants error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách kế toán.",
    });
  }
};

// ==========================================
// 11. CHI TIẾT KẾ TOÁN
// GET /api/accountants/:id
// ==========================================

export const getAccountantById = async (req, res) => {
  try {
    const accountant = await findAccountant(req.params.id);

    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản kế toán.",
      });
    }

    return res.status(200).json({
      success: true,
      accountant: accountantResponse(accountant),
    });
  } catch (error) {
    console.error("Get accountant error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin kế toán.",
    });
  }
};

// ==========================================
// 12. CẬP NHẬT KẾ TOÁN
// PUT /api/accountants/:id
// ==========================================

export const updateAccountant = async (req, res) => {
  try {
    const accountant = await findAccountant(req.params.id);

    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản kế toán.",
      });
    }

    const { name, email, phone } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Họ tên không được để trống.",
        });
      }

      accountant.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email không được để trống.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: accountant._id },
      });

      if (existingUser) return handleDuplicateEmail(res);

      accountant.email = normalizedEmail;
    }

    if (phone !== undefined) {
      accountant.phone = String(phone).trim();
    }

    await accountant.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật kế toán thành công.",
      accountant: accountantResponse(accountant),
    });
  } catch (error) {
    console.error("Update accountant error:", error);

    if (error.code === 11000) return handleDuplicateEmail(res);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông tin kế toán.",
    });
  }
};

// ==========================================
// 13. KHÓA KẾ TOÁN
// PATCH /api/accountants/:id/lock
// ==========================================

export const lockAccountant = async (req, res) => {
  try {
    const accountant = await findAccountant(req.params.id);

    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản kế toán.",
      });
    }

    if (!accountant.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản kế toán đã bị khóa.",
      });
    }

    accountant.isActive = false;
    await accountant.save();

    return res.status(200).json({
      success: true,
      message: "Đã khóa tài khoản kế toán.",
      accountant: accountantResponse(accountant),
    });
  } catch (error) {
    console.error("Lock accountant error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể khóa tài khoản kế toán.",
    });
  }
};

// ==========================================
// 14. MỞ KHÓA KẾ TOÁN
// PATCH /api/accountants/:id/unlock
// ==========================================

export const unlockAccountant = async (req, res) => {
  try {
    const accountant = await findAccountant(req.params.id);

    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản kế toán.",
      });
    }

    accountant.isActive = true;
    accountant.status = "working";

    await accountant.save();

    return res.status(200).json({
      success: true,
      message: "Mở khóa tài khoản kế toán thành công.",
      accountant: accountantResponse(accountant),
    });
  } catch (error) {
    console.error("Unlock accountant error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể mở khóa tài khoản kế toán.",
    });
  }
};

// ==========================================
// 15. CẤP LẠI MẬT KHẨU KẾ TOÁN
// PATCH /api/accountants/:id/reset-password
// ==========================================

export const resetAccountantPassword = async (req, res) => {
  try {
    const accountant = await findAccountant(req.params.id);

    if (!accountant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản kế toán.",
      });
    }

    if (!accountant.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản kế toán đang bị khóa.",
      });
    }

    // Tạo mật khẩu tạm mới
    const temporaryPassword = createTemporaryPassword();

    // User Model phải có pre-save hook bcrypt
    accountant.password = temporaryPassword;
    accountant.mustChangePassword = true;

    await accountant.save();

    const credentials = {
      email: accountant.email,
      temporaryPassword,
    };

    return res.status(200).json({
      success: true,
      message: `Đã cấp lại mật khẩu cho ${accountant.name}.`,
      accountant: accountantResponse(accountant),

      // Frontend đọc data.credentials.temporaryPassword
      credentials,

      // Giữ thêm các trường tương thích
      temporaryPassword,
      tempPassword: temporaryPassword,
    });
  } catch (error) {
    console.error("Reset accountant password error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cấp lại mật khẩu kế toán.",
    });
  }
};

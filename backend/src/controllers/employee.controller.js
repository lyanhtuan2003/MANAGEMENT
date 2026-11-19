
import mongoose from "mongoose";
import User from "../models/User.js";

// ==========================================
// HÀM DÙNG CHUNG
// ==========================================

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validStatuses = ["working", "probation", "resigned"];

const employeeResponse = (user) => ({
  id: user._id,
  _id: user._id,
  employeeCode: user.employeeCode || "",
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  avatar: user.avatar || "",
  position: user.position || "",
  department: user.department || "",
  salary: Number(user.salary || 0),
  status: user.status || "working",
  role: user.role,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const accountantResponse = employeeResponse;

const createTemporaryPassword = () => {
  const password = User.generateTemporaryPassword();

  if (!password || password.length < 6) {
    throw new Error("Không thể tạo mật khẩu tạm.");
  }

  return password;
};

const handleDuplicateEmail = (res) =>
  res.status(409).json({
    success: false,
    message: "Email đã được tài khoản khác sử dụng.",
  });

const validateSalary = (salary) =>
  salary === undefined ||
  (
    Number.isFinite(Number(salary)) &&
    Number(salary) >= 0
  );

const validateStatus = (status) =>
  status === undefined || validStatuses.includes(status);

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

const getAccountFields = (body) => ({
  name: body.name.trim(),
  email: body.email.trim().toLowerCase(),
  phone: String(body.phone || "").trim(),
  position: String(body.position || "").trim(),
  department: String(body.department || "").trim(),
  salary: Number(body.salary || 0),
  status: body.status || "working",
});

const validateCreateBody = (body, res, accountName) => {
  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.email !== "string" ||
    !body.email.trim()
  ) {
    res.status(400).json({
      success: false,
      message: `Vui lòng nhập họ tên và email ${accountName}.`,
    });

    return false;
  }

  if (!validateSalary(body.salary)) {
    res.status(400).json({
      success: false,
      message: "Mức lương không hợp lệ.",
    });

    return false;
  }

  if (!validateStatus(body.status)) {
    res.status(400).json({
      success: false,
      message: "Trạng thái tài khoản không hợp lệ.",
    });

    return false;
  }

  if (body.status === "resigned") {
    res.status(400).json({
      success: false,
      message: "Không thể tạo tài khoản đã nghỉ việc.",
    });

    return false;
  }

  return true;
};

// ==========================================
// TẠO TÀI KHOẢN CHUNG
// ==========================================

const createAccount = async (req, res, role) => {
  try {
    const accountName =
      role === "accountant" ? "kế toán" : "nhân viên";

    if (!validateCreateBody(req.body, res, accountName)) {
      return;
    }

    const fields = getAccountFields(req.body);

    const existingUser = await User.findOne({
      email: fields.email,
    });

    if (existingUser) {
      return handleDuplicateEmail(res);
    }

    const employeeCode =
      await User.generateEmployeeCode();

    const temporaryPassword =
      createTemporaryPassword();

    const user = await User.create({
      ...fields,
      employeeCode,
      password: temporaryPassword,
      role,
      isActive: true,
      mustChangePassword: true,
    });

    const response =
      role === "accountant"
        ? accountantResponse(user)
        : employeeResponse(user);

    return res.status(201).json({
      success: true,
      message: `Tạo tài khoản ${accountName} thành công.`,
      employee: response,
      accountant: response,
      credentials: {
        employeeCode: user.employeeCode,
        email: user.email,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Create account error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email hoặc mã nhân viên đã tồn tại.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản.",
    });
  }
};

// ==========================================
// 1. NHÂN VIÊN
// ==========================================

export const createEmployee = (req, res) =>
  createAccount(req, res, "employee");

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
// CẬP NHẬT TÀI KHOẢN CHUNG
// ==========================================

const updateAccount = async (req, res, role) => {
  try {
    const account =
      role === "accountant"
        ? await findAccountant(req.params.id)
        : await findEmployee(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
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

      account.name = name.trim();
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
        _id: { $ne: account._id },
      });

      if (existingUser) {
        return handleDuplicateEmail(res);
      }

      account.email = normalizedEmail;
    }

    if (phone !== undefined) {
      account.phone = String(phone).trim();
    }

    if (position !== undefined) {
      account.position = String(position).trim();
    }

    if (department !== undefined) {
      account.department = String(department).trim();
    }

    if (salary !== undefined) {
      if (!validateSalary(salary)) {
        return res.status(400).json({
          success: false,
          message: "Mức lương không hợp lệ.",
        });
      }

      account.salary = Number(salary);
    }

    if (status !== undefined) {
      if (!validateStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ.",
        });
      }

      account.status = status;

      if (status === "resigned") {
        account.isActive = false;
      } else if (account.isActive === false) {
        account.isActive = true;
      }
    }

    // Bổ sung mã cho tài khoản cũ chưa có mã
    if (!account.employeeCode) {
      account.employeeCode =
        await User.generateEmployeeCode();
    }

    await account.save();

    const response =
      role === "accountant"
        ? accountantResponse(account)
        : employeeResponse(account);

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công.",
      employee: response,
      accountant: response,
    });
  } catch (error) {
    console.error("Update account error:", error);

    if (error.code === 11000) {
      return handleDuplicateEmail(res);
    }

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông tin tài khoản.",
    });
  }
};

export const updateEmployee = (req, res) =>
  updateAccount(req, res, "employee");

// ==========================================
// KHÓA / MỞ KHÓA / NGHỈ VIỆC NHÂN VIÊN
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

export const unlockEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    employee.isActive = true;

    if (employee.status === "resigned") {
      employee.status = "working";
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Đã mở khóa tài khoản nhân viên.",
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Unlock employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể mở khóa nhân viên.",
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await findEmployee(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhân viên.",
      });
    }

    employee.status = "resigned";
    employee.isActive = false;

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật nhân viên nghỉ việc.",
      employee: employeeResponse(employee),
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhân viên nghỉ việc.",
    });
  }
};

// ==========================================
// CẤP LẠI MẬT KHẨU NHÂN VIÊN
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

    if (!employee.isActive) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhân viên đang bị khóa.",
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
// 2. KẾ TOÁN
// ==========================================

export const createAccountant = (req, res) =>
  createAccount(req, res, "accountant");

export const getAccountants = async (req, res) => {
  try {
    const {
      search = "",
      status,
      department,
      isActive,
    } = req.query;

    const filter = { role: "accountant" };

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

    const accountants = await User.find(filter)
      .sort({ createdAt: -1 });

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

export const updateAccountant = (req, res) =>
  updateAccount(req, res, "accountant");

// ==========================================
// KHÓA / MỞ KHÓA KẾ TOÁN
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

    if (accountant.status === "resigned") {
      accountant.status = "working";
    }

    await accountant.save();

    return res.status(200).json({
      success: true,
      message: "Đã mở khóa tài khoản kế toán.",
      accountant: accountantResponse(accountant),
    });
  } catch (error) {
    console.error("Unlock accountant error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể mở khóa kế toán.",
    });
  }
};

// ==========================================
// CẤP LẠI MẬT KHẨU KẾ TOÁN
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

    const temporaryPassword = createTemporaryPassword();

    accountant.password = temporaryPassword;
    accountant.mustChangePassword = true;

    await accountant.save();

    return res.status(200).json({
      success: true,
      message: `Đã cấp lại mật khẩu cho ${accountant.name}.`,
      accountant: accountantResponse(accountant),
      credentials: {
        employeeCode: accountant.employeeCode,
        email: accountant.email,
        temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Reset accountant password error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cấp lại mật khẩu kế toán.",
    });
  }
};

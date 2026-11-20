
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  UserX,
  RefreshCw,
  X,
  Mail,
  Phone,
  BriefcaseBusiness,
  Building2,
  Wallet,
  Copy,
  Check,
  KeyRound,
  LoaderCircle,
  Users,
} from "lucide-react";

import "./ManagerEmployees.css";
import EmployeeConfirm, { EmployeeToast } from "./EmployeeConfirm";
import "./EmployeeConfirm.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  position: "",
  department: "Marketing",
  salary: "",
  status: "working",
  role: "employee",
};

const statusLabels = {
  working: "Đang làm việc",
  probation: "Thử việc",
  resigned: "Đã nghỉ việc",
};

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getId = (item) => item?.id || item?._id;

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("vi-VN") + " đ";

const getAccountRole = (item) =>
  item?.role === "accountant" ? "accountant" : "employee";

const getAccountLabel = (item) =>
  getAccountRole(item) === "accountant" ? "Kế toán" : "Nhân viên";

export default function ManagerEmployees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const [editing, setEditing] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [confirmEmployee, setConfirmEmployee] = useState(null);
  const [unlockEmployeeConfirm, setUnlockEmployeeConfirm] = useState(null);
  

  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  // ========================================
  // THÔNG BÁO
  // ========================================

  const showToast = (type, message) => {
    setToast({
      type,
      message,
      id: Date.now(),
    });
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  // ========================================
  // API REQUEST
  // ========================================

  const apiRequest = async (endpoint, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Bạn không có quyền quản lý tài khoản nhân sự."
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Có lỗi xảy ra khi gọi API.");
    }

    return data;
  };

  // ========================================
  // LẤY DANH SÁCH NHÂN VIÊN VÀ KẾ TOÁN
  // ========================================

  const fetchEmployees = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const [employeeData, accountantData] = await Promise.all([
        apiRequest("/employees"),
        apiRequest("/accountants"),
      ]);

      const employeeList = (
        employeeData.employees ||
        employeeData.data?.employees ||
        []
      ).map((item) => ({
        ...item,
        role: "employee",
      }));

      const accountantList = (
        accountantData.accountants ||
        accountantData.data?.accountants ||
        []
      ).map((item) => ({
        ...item,
        role: "accountant",
        position: item.position || "Kế toán",
        department: item.department || "Kế toán",
      }));

      setEmployees([...employeeList, ...accountantList]);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ========================================
  // TÌM KIẾM
  // ========================================

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return employees;

    return employees.filter((emp) =>
      [
        emp.name,
        emp.employeeCode,
        emp.email,
        emp.phone,
        emp.department,
        emp.position,
        getAccountLabel(emp),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [employees, search]);

  // ========================================
  // MỞ FORM THÊM / SỬA
  // ========================================

  const openForm = (employee = null) => {
    setEditing(employee);
    setError("");

    if (employee) {
      setForm({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        department: employee.department || "Marketing",
        salary: String(employee.salary || 0),
        status: employee.status || "working",
        role: getAccountRole(employee),
      });
    } else {
      setForm({ ...emptyForm });
    }

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ========================================
  // TẠO / CẬP NHẬT TÀI KHOẢN
  // ========================================

  const saveEmployee = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const isEditing = Boolean(editing);
      const role = isEditing ? getAccountRole(editing) : form.role;
      const id = getId(editing);

      let endpoint;
      let method;
      let payload;

      if (role === "accountant") {
        endpoint = isEditing ? `/accountants/${id}` : "/accountants";
        method = isEditing ? "PUT" : "POST";

        payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        };
      } else {
        endpoint = isEditing ? `/employees/${id}` : "/employees";
        method = isEditing ? "PUT" : "POST";

        payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          position: form.position.trim(),
          department: form.department,
          salary: Number(form.salary || 0),
          status: form.status,
        };
      }

      const data = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchEmployees(false);

      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });

      if (!isEditing && data.credentials) {
        setCredentials(data.credentials);
        setCopied(false);
        setShowCredentials(true);
      } else {
        showToast(
          "success",
          isEditing
            ? "Cập nhật thông tin thành công!"
            : `Tạo tài khoản ${role === "accountant" ? "kế toán" : "nhân viên"} thành công!`
        );
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // XEM CHI TIẾT
  // ========================================

  const viewEmployee = async (employee) => {
    try {
      const id = getId(employee);
      const role = getAccountRole(employee);

      const endpoint =
        role === "accountant"
          ? `/accountants/${id}`
          : `/employees/${id}`;

      const data = await apiRequest(endpoint);

      const detail =
        data.employee ||
        data.accountant ||
        data.user ||
        data.data?.employee ||
        data.data?.accountant ||
        data.data?.user;

      if (!detail) {
        throw new Error("Không tìm thấy thông tin tài khoản.");
      }

      setSelectedEmployee({
        ...detail,
        role,
      });

      setShowDetail(true);
    } catch (err) {
      showToast("error", err.message);
    }
  };

  // ========================================
  // KHÓA / NGỪNG KÍCH HOẠT TÀI KHOẢN
  // ========================================

  const deleteEmployee = (employee) => {
    setConfirmEmployee(employee);
  };

  const confirmDeleteEmployee = async () => {
    if (!confirmEmployee || actionLoading) return;

    try {
      setActionLoading(true);

      const id = getId(confirmEmployee);
      const role = getAccountRole(confirmEmployee);

      if (role === "accountant") {
        await apiRequest(`/accountants/${id}/lock`, {
          method: "PATCH",
        });
      } else {
        await apiRequest(`/employees/${id}`, {
          method: "DELETE",
        });
      }

      const employeeName = confirmEmployee.name;

      setConfirmEmployee(null);
      await fetchEmployees(false);
      setSelectedEmployee(null);

      showToast(
        "success",
        `Đã khóa/ngừng kích hoạt tài khoản ${employeeName}.`
      );
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

// ========================================
// MỞ KHÓA TÀI KHOẢN
// ========================================

const unlockEmployeeAccount = (employee) => {
  if (!employee || actionLoading) return;

  // Mở modal xác nhận thay vì dùng window.confirm()
  setUnlockEmployeeConfirm(employee);
};

const confirmUnlockEmployeeAccount = async () => {
  if (!unlockEmployeeConfirm || actionLoading) return;

  try {
    setActionLoading(true);

    const employee = unlockEmployeeConfirm;
    const id = getId(employee);
    const role = getAccountRole(employee);

    const endpoint =
      role === "accountant"
        ? `/accountants/${id}/unlock`
        : `/employees/${id}/unlock`;

    await apiRequest(endpoint, {
      method: "PATCH",
    });

    setUnlockEmployeeConfirm(null);

    await fetchEmployees(false);

    setSelectedEmployee(null);

    showToast(
      "success",
      `Đã mở khóa tài khoản ${employee.name}.`
    );
  } catch (err) {
    showToast("error", err.message);
  } finally {
    setActionLoading(false);
  }
};
  // ========================================
  // CẤP LẠI MẬT KHẨU
  // ========================================

  const resetEmployeePassword = async (employee) => {
    if (!employee || actionLoading) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn cấp lại mật khẩu cho ${employee.name}?\n\nMật khẩu hiện tại sẽ không còn sử dụng được.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const id = getId(employee);
      const role = getAccountRole(employee);

      const endpoint =
        role === "accountant"
          ? `/accountants/${id}/reset-password`
          : `/employees/${id}/reset-password`;

      const data = await apiRequest(endpoint, {
        method: "PATCH",
      });

      if (!data.credentials) {
        throw new Error(
          "Máy chủ không trả về thông tin mật khẩu tạm."
        );
      }

      setCredentials(data.credentials);
      setCopied(false);
      setShowCredentials(true);

      showToast(
        "success",
        data.message || "Đã cấp lại mật khẩu thành công."
      );
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ========================================
  // SAO CHÉP THÔNG TIN TÀI KHOẢN
  // ========================================

  const copyCredentials = async () => {
    if (!credentials) return;

    const content = [
      "THÔNG TIN TÀI KHOẢN",
      `Mã nhân viên: ${credentials.employeeCode || "Không có"}`,
      `Email: ${credentials.email || ""}`,
      `Mật khẩu tạm: ${credentials.temporaryPassword || ""}`,
      "",
      "Vui lòng đăng nhập và đổi mật khẩu sau khi đăng nhập.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showToast("success", "Đã sao chép thông tin tài khoản.");
    } catch {
      showToast(
        "error",
        "Không thể sao chép. Vui lòng sao chép thủ công."
      );
    }
  };

  const closeCredentials = () => {
    setShowCredentials(false);
    setCredentials(null);
    setCopied(false);
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <section className="manager-panel me-panel">
      <div className="panel-heading me-heading">
        <div>
          <h2>Quản lý nhân viên</h2>
          <p>
            Quản lý hồ sơ, tài khoản nhân viên và kế toán của công ty.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn me-add-btn"
          onClick={() => openForm()}
        >
          <Plus size={18} />
          Thêm nhân viên
        </button>
      </div>

      {error && (
        <div className="me-alert me-alert-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X size={17} />
          </button>
        </div>
      )}

      <div className="me-toolbar">
        <div className="me-search">
          <Search size={19} />

          <input
            type="text"
            placeholder="Tìm tên, mã nhân viên, email, chức vụ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="me-toolbar-right">
          <span>{filteredEmployees.length} tài khoản</span>

          <button
            type="button"
            className="me-refresh-btn"
            onClick={() => fetchEmployees()}
            disabled={loading}
            title="Làm mới danh sách"
          >
            <RefreshCw
              size={18}
              className={loading ? "me-spinning" : ""}
            />
          </button>
        </div>
      </div>

      <div className="responsive-table me-table-wrapper">
        <table className="manager-table me-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Loại tài khoản</th>
              <th>Phòng ban</th>
              <th>Chức vụ</th>
              <th>Lương cơ bản</th>
              <th>Trạng thái</th>
              <th>Tài khoản</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="me-empty">
                  <LoaderCircle
                    className="me-spinning"
                    size={25}
                  />
                  <span>Đang tải danh sách nhân sự...</span>
                </td>
              </tr>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => {
                const role = getAccountRole(emp);
                const active = emp.isActive !== false;

                return (
                  <tr key={`${role}-${getId(emp)}`}>
                    <td>
                      <div className="employee-cell">
                        <div className="avatar">
                          {emp.name?.charAt(0)?.toUpperCase() || "N"}
                        </div>

                        <div>
                          <strong>{emp.name}</strong>
                          <small>
                            {emp.employeeCode || "Chưa có mã"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`me-account ${role}`}>
                        {getAccountLabel(emp)}
                      </span>
                    </td>

                    <td>
                      {emp.department ||
                        (role === "accountant" ? "Kế toán" : "Chưa cập nhật")}
                    </td>

                    <td>
                      {emp.position ||
                        (role === "accountant" ? "Kế toán" : "Chưa cập nhật")}
                    </td>

                    <td>{formatMoney(emp.salary)}</td>

                    <td>
                      <span
                        className={`me-status me-status-${emp.status || "working"}`}
                      >
                        {statusLabels[emp.status] ||
                          "Đang làm việc"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`me-account ${
                          active ? "active" : "inactive"
                        }`}
                      >
                        {active ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        {/* ICON 1: XEM */}
                        <button
                          type="button"
                          className="table-action-btn view-action"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                          onClick={() => viewEmployee(emp)}
                        >
                          <Eye />
                        </button>

                        {/* ICON 2: CHỈNH SỬA */}
                        <button
                          type="button"
                          className="table-action-btn edit-action"
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa"
                          onClick={() => openForm(emp)}
                        >
                          <Pencil />
                        </button>

                        {/* ICON 3: CẤP LẠI MẬT KHẨU */}
                        {active && (
                          <button
                            type="button"
                            className="table-action-btn password-action"
                            title="Cấp lại mật khẩu"
                            aria-label="Cấp lại mật khẩu"
                            onClick={() => resetEmployeePassword(emp)}
                            disabled={actionLoading}
                          >
                            <KeyRound />
                          </button>
                        )}

                        {/* ICON 4: KHÓA TÀI KHOẢN - DÙNG CHUNG */}
                        {active && (
                          <button
                            type="button"
                            className="table-action-btn danger-action"
                            title="Khóa tài khoản"
                            aria-label="Khóa tài khoản"
                            onClick={() => deleteEmployee(emp)}
                            disabled={actionLoading}
                          >
                            <UserX />
                          </button>
                        )}

                        {/* MỞ KHÓA - DÙNG CHUNG CHO CẢ HAI */}
                        {!active && (
                          <button
                            type="button"
                            className="table-action-btn unlock-action"
                            title="Mở khóa tài khoản"
                            aria-label="Mở khóa tài khoản"
                            onClick={() => unlockEmployeeAccount(emp)}
                            disabled={actionLoading}
                          >
                            <RefreshCw />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="me-empty">
                  <Users size={34} />

                  <strong>
                    {search
                      ? "Không tìm thấy tài khoản"
                      : "Chưa có nhân sự"}
                  </strong>

                  <span>
                    {search
                      ? "Thử tìm kiếm bằng thông tin khác."
                      : "Nhấn Thêm nhân viên để tạo tài khoản đầu tiên."}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM / CHỈNH SỬA */}
      {showForm && (
        <div
          className="me-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <form className="me-modal" onSubmit={saveEmployee}>
            <div className="me-modal-header">
              <div>
                <h2>
                  {editing ? "Cập nhật thông tin" : "Thêm nhân sự mới"}
                </h2>

                <p>
                  {editing
                    ? "Chỉnh sửa thông tin tài khoản."
                    : "Tạo tài khoản nhân viên hoặc kế toán."}
                </p>
              </div>

              <button
                type="button"
                className="me-close"
                onClick={closeForm}
              >
                <X size={21} />
              </button>
            </div>

            {!editing && (
              <div className="me-form-note">
                <KeyRound size={19} />
                <span>
                  Hệ thống sẽ tạo tài khoản và mật khẩu tạm.
                </span>
              </div>
            )}

            <div className="me-form-grid">
              {!editing && (
                <label>
                  Loại tài khoản *
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="employee">Nhân viên</option>
                    <option value="accountant">Kế toán</option>
                  </select>
                </label>
              )}

              <label>
                Họ và tên *
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn An"
                  required
                />
              </label>

              <label>
                Email *
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="employee@gmail.com"
                  required
                />
              </label>

              <label>
                Số điện thoại
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0987654321"
                />
              </label>

              {form.role === "employee" && (
                <>
                  <label>
                    Chức vụ
                    <input
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Nhân viên Marketing"
                    />
                  </label>

                  <label>
                    Phòng ban
                    <select
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                    >
                      <option value="Marketing">Marketing</option>
                      <option value="Nhân sự">Nhân sự</option>
                      <option value="Kỹ thuật">Kỹ thuật</option>
                      <option value="Kinh doanh">Kinh doanh</option>
                      <option value="Ban quản lý">Ban quản lý</option>
                    </select>
                  </label>

                  <label>
                    Lương cơ bản (VNĐ)
                    <input
                      name="salary"
                      type="number"
                      min="0"
                      value={form.salary}
                      onChange={handleChange}
                      placeholder="10000000"
                    />
                  </label>

                  <label>
                    Trạng thái
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="working">Đang làm việc</option>
                      <option value="probation">Thử việc</option>
                    </select>
                  </label>
                </>
              )}
            </div>

            {form.role === "accountant" && !editing && (
              <div className="me-form-note">
                <Wallet size={19} />
                <span>
                  Tài khoản kế toán sẽ được cấp quyền theo cấu hình phân quyền của hệ thống.
                </span>
              </div>
            )}

            <div className="me-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="me-spinning"
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Check size={17} />
                    {editing ? "Lưu thay đổi" : "Tạo tài khoản"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL THÔNG TIN ĐĂNG NHẬP */}
      {showCredentials && credentials && (
        <div className="me-overlay">
          <div className="me-modal me-credentials-modal">
            <div className="me-success-icon">
              <Check size={30} />
            </div>

            <h2>Thông tin tài khoản</h2>

            <p>
              Gửi thông tin dưới đây cho nhân sự.
              Mật khẩu tạm chỉ được hiển thị trong lần này.
            </p>

            <div className="me-credentials">
              <div>
                <span>Mã nhân viên</span>
                <strong>
                  {credentials.employeeCode || "Không có"}
                </strong>
              </div>

              <div>
                <span>Email đăng nhập</span>
                <strong>{credentials.email}</strong>
              </div>

              <div>
                <span>Mật khẩu tạm</span>
                <strong className="me-password">
                  {credentials.temporaryPassword}
                </strong>
              </div>
            </div>

            <div className="me-credential-note">
              Người dùng cần đổi mật khẩu sau khi đăng nhập.
              Hãy sao chép mật khẩu trước khi đóng cửa sổ này.
            </div>

            <div className="me-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={copyCredentials}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? "Đã sao chép" : "Sao chép thông tin"}
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={closeCredentials}
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT */}
      {showDetail && selectedEmployee && (
        <div
          className="me-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetail(false);
            }
          }}
        >
          <div className="me-modal me-detail-modal">
            <div className="me-modal-header">
              <div>
                <h2>Thông tin nhân sự</h2>
                <p>Chi tiết hồ sơ và tài khoản</p>
              </div>

              <button
                type="button"
                className="me-close"
                onClick={() => setShowDetail(false)}
              >
                <X size={21} />
              </button>
            </div>

            <div className="me-detail-profile">
              <div className="me-detail-avatar">
                {selectedEmployee.name?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <h3>{selectedEmployee.name}</h3>
                <span>
                  {selectedEmployee.employeeCode || "Chưa có mã"}
                  {" · "}
                  {getAccountLabel(selectedEmployee)}
                </span>
              </div>
            </div>

            <div className="me-detail-grid">
              <div>
                <Mail size={18} />
                <section>
                  <small>Email</small>
                  <strong>{selectedEmployee.email}</strong>
                </section>
              </div>

              <div>
                <Phone size={18} />
                <section>
                  <small>Số điện thoại</small>
                  <strong>
                    {selectedEmployee.phone || "Chưa cập nhật"}
                  </strong>
                </section>
              </div>

              <div>
                <BriefcaseBusiness size={18} />
                <section>
                  <small>Chức vụ</small>
                  <strong>
                    {selectedEmployee.position ||
                      (getAccountRole(selectedEmployee) === "accountant"
                        ? "Kế toán"
                        : "Chưa cập nhật")}
                  </strong>
                </section>
              </div>

              <div>
                <Building2 size={18} />
                <section>
                  <small>Phòng ban</small>
                  <strong>
                    {selectedEmployee.department ||
                      (getAccountRole(selectedEmployee) === "accountant"
                        ? "Kế toán"
                        : "Chưa cập nhật")}
                  </strong>
                </section>
              </div>

              <div>
                <Wallet size={18} />
                <section>
                  <small>Lương cơ bản</small>
                  <strong>
                    {formatMoney(selectedEmployee.salary)}
                  </strong>
                </section>
              </div>

              <div>
                <Users size={18} />
                <section>
                  <small>Trạng thái</small>
                  <strong>
                    {selectedEmployee.isActive === false
                      ? "Đã khóa"
                      : statusLabels[selectedEmployee.status] ||
                        "Đang làm việc"}
                  </strong>
                </section>
              </div>
            </div>

            <div className="me-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDetail(false)}
              >
                Đóng
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setShowDetail(false);
                  openForm(selectedEmployee);
                }}
              >
                <Pencil size={17} />
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
{/* MODAL XÁC NHẬN MỞ KHÓA */}
{unlockEmployeeConfirm && (
  <div
    className="me-unlock-overlay"
    onMouseDown={(e) => {
      if (
        e.target === e.currentTarget &&
        !actionLoading
      ) {
        setUnlockEmployeeConfirm(null);
      }
    }}
  >
    <div
      className="me-unlock-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-modal-title"
    >
      <button
        type="button"
        className="me-unlock-close"
        onClick={() => setUnlockEmployeeConfirm(null)}
        disabled={actionLoading}
        aria-label="Đóng"
      >
        <X size={20} />
      </button>

      <div className="me-unlock-icon">
        <KeyRound size={30} />
      </div>

      <h2 id="unlock-modal-title">
        Xác nhận mở khóa tài khoản
      </h2>

      <p className="me-unlock-description">
        Bạn có chắc chắn muốn mở khóa tài khoản của nhân sự này?
      </p>

      <div className="me-unlock-employee">
        <div className="me-unlock-avatar">
          {unlockEmployeeConfirm.name
            ?.charAt(0)
            ?.toUpperCase() || "N"}
        </div>

        <div className="me-unlock-employee-info">
          <strong>{unlockEmployeeConfirm.name}</strong>

          <span>
            {unlockEmployeeConfirm.employeeCode ||
              "Chưa có mã nhân viên"}
          </span>

          <small>
            {getAccountLabel(unlockEmployeeConfirm)}
          </small>
        </div>
      </div>

      <div className="me-unlock-warning">
        <KeyRound size={17} />

        <span>
          Sau khi mở khóa, tài khoản có thể tiếp tục
          đăng nhập vào hệ thống.
        </span>
      </div>

      <div className="me-unlock-actions">
        <button
          type="button"
          className="me-unlock-cancel"
          onClick={() => setUnlockEmployeeConfirm(null)}
          disabled={actionLoading}
        >
          Hủy
        </button>

        <button
          type="button"
          className="me-unlock-submit"
          onClick={confirmUnlockEmployeeAccount}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <>
              <LoaderCircle
                size={17}
                className="me-spinning"
              />
              Đang xử lý...
            </>
          ) : (
            <>
              <KeyRound size={17} />
              Xác nhận mở khóa
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
      {/* XÁC NHẬN KHÓA / NGỪNG KÍCH HOẠT */}
      {confirmEmployee && (
        <EmployeeConfirm
          type="delete"
          title="Khóa tài khoản?"
          message={`Bạn có chắc chắn muốn khóa/ngừng kích hoạt tài khoản của ${confirmEmployee.name}?`}
          confirmText={actionLoading ? "Đang xử lý..." : "Đồng ý"}
          cancelText="Không, quay lại"
          onCancel={() => {
            if (!actionLoading) setConfirmEmployee(null);
          }}
          onConfirm={confirmDeleteEmployee}
        />
      )}

      {toast && (
        <EmployeeToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}

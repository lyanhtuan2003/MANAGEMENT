
import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Users,
  Mail,
  Phone,
  BriefcaseBusiness,
  Building2,
  Wallet,
  Copy,
  Check,
  KeyRound,
  LoaderCircle,
  LockOpen,
} from "lucide-react";

import "./ManagerEmployees.css";

import EmployeeConfirm, {
  EmployeeToast,
} from "./EmployeeConfirm";

import "./EmployeeConfirm.css";

const API_URL = "http://localhost:5000/api";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  position: "",
  department: "Marketing",
  salary: "",
  status: "working",
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

const getEmployeeId = (employee) =>
  employee?.id || employee?._id;

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("vi-VN") + " đ";

export default function ManagerEmployees() {
  // =====================================
  // STATE
  // =====================================

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

  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  // =====================================
  // TOAST
  // =====================================

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

  // =====================================
  // API REQUEST
  // =====================================

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
        "Bạn không có quyền quản lý nhân viên."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Có lỗi xảy ra khi gọi API."
      );
    }

    return data;
  };

  // =====================================
  // LẤY DANH SÁCH NHÂN VIÊN
  // =====================================

  const fetchEmployees = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const data = await apiRequest("/employees");

      setEmployees(data.employees || []);

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

  // =====================================
  // TÌM KIẾM
  // =====================================

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
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [employees, search]);

  // =====================================
  // MỞ FORM THÊM / SỬA
  // =====================================

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

  // =====================================
  // TẠO / CẬP NHẬT NHÂN VIÊN
  // =====================================

  const saveEmployee = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        salary: Number(form.salary || 0),
      };

      const isEditing = Boolean(editing);
      const employeeId = getEmployeeId(editing);

      const endpoint = isEditing
        ? `/employees/${employeeId}`
        : "/employees";

      const data = await apiRequest(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      await fetchEmployees(false);

      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });

      if (!isEditing && data.credentials) {
        setCredentials(data.credentials);
        setShowCredentials(true);
      } else {
        showToast(
          "success",
          isEditing
            ? "Cập nhật thông tin nhân viên thành công!"
            : "Tạo nhân viên thành công!"
        );
      }
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // =====================================
  // XEM CHI TIẾT
  // =====================================

  const viewEmployee = async (employee) => {
    try {
      const id = getEmployeeId(employee);

      const data = await apiRequest(`/employees/${id}`);

      setSelectedEmployee(data.employee);
      setShowDetail(true);
    } catch (err) {
      showToast("error", err.message);
    }
  };

  // =====================================
  // NGỪNG KÍCH HOẠT NHÂN VIÊN
  // =====================================

  const deleteEmployee = (employee) => {
    setConfirmEmployee(employee);
  };

  const confirmDeleteEmployee = async () => {
    if (!confirmEmployee || actionLoading) return;

    try {
      setActionLoading(true);

      const id = getEmployeeId(confirmEmployee);

      await apiRequest(`/employees/${id}`, {
        method: "DELETE",
      });

      const employeeName = confirmEmployee.name;

      setConfirmEmployee(null);

      await fetchEmployees(false);

      setSelectedEmployee(null);

      showToast(
        "success",
        `Đã ngừng kích hoạt tài khoản của ${employeeName}.`
      );
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =====================================
  // MỞ KHÓA TÀI KHOẢN
  // =====================================

  const unlockEmployeeAccount = async (employee) => {
    if (!employee || actionLoading) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn mở khóa tài khoản của ${employee.name}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const id = getEmployeeId(employee);

      const data = await apiRequest(
        `/employees/${id}/unlock`,
        {
          method: "PATCH",
        }
      );

      await fetchEmployees(false);

      if (
        selectedEmployee &&
        getEmployeeId(selectedEmployee) === id
      ) {
        setSelectedEmployee(data.employee);
      }

      showToast(
        "success",
        data.message || "Đã mở khóa tài khoản."
      );
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =====================================
  // CẤP LẠI MẬT KHẨU
  // =====================================

  const resetEmployeePassword = async (employee) => {
    if (!employee || actionLoading) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn cấp lại mật khẩu cho ${employee.name}?\n\nMật khẩu hiện tại sẽ không còn sử dụng được.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const id = getEmployeeId(employee);

      const data = await apiRequest(
        `/employees/${id}/reset-password`,
        {
          method: "PATCH",
        }
      );

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

  // =====================================
  // SAO CHÉP THÔNG TIN TÀI KHOẢN
  // =====================================

  const copyCredentials = async () => {
    if (!credentials) return;

    const content = [
      "THÔNG TIN TÀI KHOẢN NHÂN VIÊN",
      `Mã nhân viên: ${credentials.employeeCode}`,
      `Email: ${credentials.email}`,
      `Mật khẩu tạm: ${credentials.temporaryPassword}`,
      "",
      "Vui lòng đăng nhập và đổi mật khẩu sau khi đăng nhập.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      showToast(
        "success",
        "Đã sao chép thông tin tài khoản."
      );
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

  // =====================================
  // GIAO DIỆN
  // =====================================

  return (
    <section className="manager-panel me-panel">

      {/* HEADER */}

      <div className="panel-heading me-heading">
        <div>
          <h2>Danh sách nhân viên</h2>
          <p>Quản lý hồ sơ và tài khoản nhân sự</p>
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

      {/* LỖI */}

      {error && (
        <div className="me-alert me-alert-error">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* THANH TÌM KIẾM */}

      <div className="me-toolbar">
        <div className="me-search">
          <Search size={19} />

          <input
            type="text"
            placeholder="Tìm tên, mã nhân viên, email..."
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
          <span>{filteredEmployees.length} nhân viên</span>

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

      {/* BẢNG NHÂN VIÊN */}

      <div className="responsive-table me-table-wrapper">
        <table className="manager-table me-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
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
                <td colSpan="7" className="me-empty">
                  <LoaderCircle
                    className="me-spinning"
                    size={25}
                  />
                  <span>Đang tải danh sách nhân viên...</span>
                </td>
              </tr>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <tr key={getEmployeeId(emp)}>
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

                  <td>{emp.department || "Chưa cập nhật"}</td>

                  <td>{emp.position || "Chưa cập nhật"}</td>

                  <td>{formatMoney(emp.salary)}</td>

                  <td>
                    <span
                      className={`me-status me-status-${emp.status}`}
                    >
                      {statusLabels[emp.status] || emp.status}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`me-account ${
                        emp.isActive ? "active" : "inactive"
                      }`}
                    >
                      {emp.isActive ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>

                  <td>
                    <div className="table-actions">

                      <button
                        type="button"
                        title="Xem chi tiết"
                        onClick={() => viewEmployee(emp)}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Chỉnh sửa"
                        onClick={() => openForm(emp)}
                      >
                        <Pencil size={17} />
                      </button>

                      {/* CẤP LẠI MẬT KHẨU */}

                      {emp.isActive && emp.status !== "resigned" && (
                        <button
                          type="button"
                          className="reset-password-action"
                          title="Cấp lại mật khẩu"
                          onClick={() => resetEmployeePassword(emp)}
                          disabled={actionLoading}
                        >
                          <KeyRound size={17} />
                        </button>
                      )}

                      {/* MỞ KHÓA */}

                      {!emp.isActive && emp.status !== "resigned" && (
                        <button
                          type="button"
                          className="unlock-action"
                          title="Mở khóa tài khoản"
                          onClick={() => unlockEmployeeAccount(emp)}
                          disabled={actionLoading}
                        >
                          <LockOpen size={17} />
                        </button>
                      )}

                      {/* NGỪNG KÍCH HOẠT */}

                      {emp.isActive && emp.status !== "resigned" && (
                        <button
                          type="button"
                          className="delete-action"
                          title="Ngừng kích hoạt / cho nghỉ việc"
                          onClick={() => deleteEmployee(emp)}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="me-empty">
                  <Users size={34} />

                  <strong>
                    {search
                      ? "Không tìm thấy nhân viên"
                      : "Chưa có nhân viên"}
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

      {/* ===================================
          MODAL THÊM / CHỈNH SỬA
      =================================== */}

      {showForm && (
        <div
          className="me-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <form
            className="me-modal"
            onSubmit={saveEmployee}
          >
            <div className="me-modal-header">
              <div>
                <h2>
                  {editing
                    ? "Cập nhật nhân viên"
                    : "Thêm nhân viên mới"}
                </h2>

                <p>
                  {editing
                    ? "Chỉnh sửa thông tin nhân viên."
                    : "Tạo hồ sơ và tài khoản đăng nhập cho nhân viên."}
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
                  Hệ thống sẽ tự tạo mã nhân viên và mật khẩu tạm.
                </span>
              </div>
            )}

            <div className="me-form-grid">
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
                  <option value="Kế toán">Kế toán</option>
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
            </div>

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

      {/* ===================================
          MODAL THÔNG TIN ĐĂNG NHẬP
      =================================== */}

      {showCredentials && credentials && (
        <div className="me-overlay">
          <div className="me-modal me-credentials-modal">
            <div className="me-success-icon">
              <Check size={30} />
            </div>

            <h2>Thông tin tài khoản</h2>

            <p>
              Gửi thông tin dưới đây cho nhân viên.
              Mật khẩu tạm chỉ được hiển thị trong lần này.
            </p>

            <div className="me-credentials">
              <div>
                <span>Mã nhân viên</span>
                <strong>{credentials.employeeCode}</strong>
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
              Nhân viên cần đổi mật khẩu sau khi đăng nhập.
              Hãy sao chép mật khẩu trước khi đóng cửa sổ này.
            </div>

            <div className="me-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={copyCredentials}
              >
                {copied ? (
                  <Check size={17} />
                ) : (
                  <Copy size={17} />
                )}

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

      {/* ===================================
          MODAL CHI TIẾT NHÂN VIÊN
      =================================== */}

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
                <h2>Thông tin nhân viên</h2>
                <p>Chi tiết hồ sơ nhân sự</p>
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
                <span>{selectedEmployee.employeeCode}</span>
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
                    {selectedEmployee.position || "Chưa cập nhật"}
                  </strong>
                </section>
              </div>

              <div>
                <Building2 size={18} />
                <section>
                  <small>Phòng ban</small>
                  <strong>
                    {selectedEmployee.department || "Chưa cập nhật"}
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
                    {statusLabels[selectedEmployee.status] ||
                      selectedEmployee.status}
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

      {/* ===================================
          MODAL XÁC NHẬN NGỪNG KÍCH HOẠT
      =================================== */}

      {confirmEmployee && (
        <EmployeeConfirm
          type="delete"
          title="Ngừng kích hoạt nhân viên?"
          message={`Bạn có chắc chắn muốn ngừng kích hoạt tài khoản của ${confirmEmployee.name}? Nhân viên sẽ không thể đăng nhập vào hệ thống.`}
          confirmText={
            actionLoading ? "Đang xử lý..." : "Đồng ý"
          }
          cancelText="Không, quay lại"
          onCancel={() => {
            if (!actionLoading) {
              setConfirmEmployee(null);
            }
          }}
          onConfirm={confirmDeleteEmployee}
        />
      )}

      {/* TOAST */}

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

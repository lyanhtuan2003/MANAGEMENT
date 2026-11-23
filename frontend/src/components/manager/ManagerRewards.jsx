
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Gift,
  AlertTriangle,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  CalendarDays,
  Wallet,
  FileText,
} from "lucide-react";

import "./ManagerRewards.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE_URL = RAW_API_URL
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_URL = `${API_BASE_URL}/api`;

// ========================================
// HELPERS
// ========================================

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const createEmptyForm = () => ({
  employeeId: "",
  type: "Thưởng",
  amount: "",
  reason: "",
  date: getToday(),
});

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("vi-VN");
};

const getInputDate = (value) => {
  if (!value) return getToday();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return getToday();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isActiveRewardEmployee = (employee) => {
  const validRole = ["employee", "accountant"].includes(employee?.role);

  const inactiveStatuses = [
    "resigned",
    "inactive",
    "locked",
    "terminated",
  ];

  return (
    validRole &&
    employee?.isActive !== false &&
    !inactiveStatuses.includes(employee?.status)
  );
};

// ========================================
// MAIN COMPONENT
// ========================================

export default function ManagerRewards() {
  const [records, setRecords] = useState([]);
  const [rewardEmployees, setRewardEmployees] = useState([]);

  const [summary, setSummary] = useState({
    totalReward: 0,
    totalPenalty: 0,
    rewardCount: 0,
    penaltyCount: 0,
    totalRecords: 0,
  });

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(createEmptyForm);
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");

  // Tìm kiếm nhân viên trong form
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] =
    useState(false);

  // PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal xác nhận xóa tùy chỉnh
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ========================================
  // API REQUEST
  // ========================================

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy token. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || `Yêu cầu thất bại (${response.status}).`
      );
    }

    return data;
  }, []);

  // ========================================
  // LOAD REWARD RECORDS
  // ========================================

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/rewards/manager");

      const nextRecords = Array.isArray(data.records)
        ? data.records
        : [];

      setRecords(nextRecords);

      setSummary({
        totalReward: Number(data.summary?.totalReward || 0),
        totalPenalty: Number(data.summary?.totalPenalty || 0),
        rewardCount: Number(data.summary?.rewardCount || 0),
        penaltyCount: Number(data.summary?.penaltyCount || 0),
        totalRecords: Number(
          data.summary?.totalRecords ?? nextRecords.length
        ),
      });
    } catch (err) {
      console.error("Fetch rewards error:", err);

      setError(
        err.message || "Không thể tải dữ liệu thưởng phạt."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  // ========================================
  // LOAD EMPLOYEES + ACCOUNTANTS
  // GET /api/rewards/manager/employees
  // ========================================

  const fetchRewardEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);

      const data = await apiRequest(
        "/rewards/manager/employees"
      );

      setRewardEmployees(
        Array.isArray(data.employees)
          ? data.employees
          : []
      );
    } catch (err) {
      console.error("Fetch reward employees error:", err);

      setRewardEmployees([]);

      setError(
        err.message || "Không thể tải danh sách nhân viên."
      );
    } finally {
      setEmployeesLoading(false);
    }
  }, [apiRequest]);

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    fetchRecords();
    fetchRewardEmployees();
  }, [fetchRecords, fetchRewardEmployees]);

  // ========================================
  // ACTIVE EMPLOYEES
  // ========================================

  const activeEmployees = useMemo(
    () => rewardEmployees.filter(isActiveRewardEmployee),
    [rewardEmployees]
  );

  // ========================================
  // SEARCH EMPLOYEES
  // ========================================

  const filteredRewardEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();

    if (!search) return activeEmployees;

    return activeEmployees.filter((employee) => {
      const searchableValues = [
        employee.name,
        employee.employeeCode,
        employee.department,
        employee.position,
        employee.jobTitle,
        employee.role === "accountant" ? "kế toán" : "",
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [activeEmployees, employeeSearch]);

  const selectedRewardEmployee = activeEmployees.find(
    (employee) =>
      String(employee._id) === String(form.employeeId)
  );

  // ========================================
  // SEARCH + FILTER RECORDS
  // ========================================

  const filteredRecords = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return records.filter((record) => {
      const employeeName =
        record.employee?.name ||
        record.employeeName ||
        "";

      const employeeCode =
        record.employee?.employeeCode ||
        record.employeeCode ||
        "";

      const matchesKeyword =
        !search ||
        employeeName.toLowerCase().includes(search) ||
        employeeCode.toLowerCase().includes(search) ||
        String(record.reason || "")
          .toLowerCase()
          .includes(search);

      const matchesType =
        filterType === "Tất cả" ||
        record.type === filterType;

      return matchesKeyword && matchesType;
    });
  }, [records, keyword, filterType]);

  // ========================================
  // PAGINATION
  // ========================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / pageSize)
  );

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredRecords.slice(
      startIndex,
      startIndex + pageSize
    );
  }, [filteredRecords, currentPage]);

  const displayedFrom =
    filteredRecords.length === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const displayedTo = Math.min(
    currentPage * pageSize,
    filteredRecords.length
  );

  const goToPage = (page) => {
    setCurrentPage(
      Math.max(1, Math.min(page, totalPages))
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, filterType]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ========================================
  // OPEN CREATE FORM
  // ========================================

  const openCreateForm = () => {
    setEditingId(null);
    setForm(createEmptyForm());

    setEmployeeSearch("");
    setShowEmployeeDropdown(false);

    setError("");
    setSuccess("");
    setShowForm(true);

    fetchRewardEmployees();
  };

  // ========================================
  // OPEN EDIT FORM
  // ========================================

  const openEditForm = (record) => {
    const employeeId =
      record.employee?._id ||
      record.employee ||
      "";

    setEditingId(record._id);

    setForm({
      employeeId: String(employeeId),
      type: record.type || "Thưởng",
      amount: String(record.amount ?? ""),
      reason: record.reason || "",
      date: getInputDate(record.date),
    });

    setEmployeeSearch("");
    setShowEmployeeDropdown(false);

    setError("");
    setSuccess("");
    setShowForm(true);

    fetchRewardEmployees();
  };

  // ========================================
  // CLOSE FORM
  // ========================================

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());

    setEmployeeSearch("");
    setShowEmployeeDropdown(false);

    setError("");
  };

  // ========================================
  // SAVE / UPDATE REWARD
  // ========================================

  const saveRecord = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.employeeId) {
      setError("Vui lòng chọn nhân viên.");
      return;
    }

    const amount = Number(form.amount);

    if (
      form.amount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError("Số tiền phải là số lớn hơn 0.");
      return;
    }

    if (!Number.isSafeInteger(amount)) {
      setError("Số tiền phải là số nguyên hợp lệ.");
      return;
    }

    if (!form.reason.trim()) {
      setError("Vui lòng nhập lý do thưởng hoặc phạt.");
      return;
    }

    if (form.reason.trim().length > 1000) {
      setError("Lý do không được vượt quá 1000 ký tự.");
      return;
    }

    if (!form.date) {
      setError("Vui lòng chọn ngày áp dụng.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        employeeId: form.employeeId,
        type: form.type,
        amount,
        reason: form.reason.trim(),
        date: form.date,
      };

      const path = editingId
        ? `/rewards/manager/${editingId}`
        : "/rewards/manager";

      const data = await apiRequest(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditingId(null);
      setForm(createEmptyForm());

      setEmployeeSearch("");
      setShowEmployeeDropdown(false);

      setSuccess(
        data.message || "Lưu quyết định thành công."
      );

      await fetchRecords();
    } catch (err) {
      console.error("Save reward error:", err);

      setError(
        err.message || "Không thể lưu quyết định."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // OPEN DELETE CONFIRMATION MODAL
  // ========================================

  const handleDelete = (record) => {
    setError("");
    setSuccess("");
    setDeleteTarget(record);
  };

  // ========================================
  // CONFIRM DELETE
  // ========================================

  const confirmDeleteReward = async () => {
    if (!deleteTarget || deleting) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/rewards/manager/${deleteTarget._id}`,
        {
          method: "DELETE",
        }
      );

      setDeleteTarget(null);

      setSuccess(
        data.message || "Đã xóa quyết định."
      );

      await fetchRecords();
    } catch (err) {
      console.error("Delete reward error:", err);

      setError(
        err.message || "Không thể xóa quyết định."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="manager-panel manager-rewards">

      {/* HEADER */}
      <div className="panel-heading">
        <div>
          <h2>Quản lý thưởng &amp; phạt</h2>
          <p>
            Ghi nhận thành tích và xử lý vi phạm nhân sự
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Thêm quyết định
        </button>
      </div>

      {/* NOTIFICATIONS */}
      {error && !showForm && (
        <div
          className="reward-message error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="reward-message success"
          role="status"
        >
          {success}
        </div>
      )}

      {/* SUMMARY */}
      <div className="reward-summary">

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-green">
            <Gift size={24} />
          </div>

          <div>
            <span>Tổng tiền thưởng</span>
            <h2>{formatMoney(summary.totalReward)}</h2>
            <small>
              {summary.rewardCount} quyết định
            </small>
          </div>
        </div>

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-red">
            <AlertTriangle size={24} />
          </div>

          <div>
            <span>Tổng tiền phạt</span>
            <h2>{formatMoney(summary.totalPenalty)}</h2>
            <small>
              {summary.penaltyCount} quyết định
            </small>
          </div>
        </div>

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-blue">
            <FileText size={24} />
          </div>

          <div>
            <span>Tổng quyết định</span>
            <h2>{summary.totalRecords}</h2>
            <small>Thưởng và phạt</small>
          </div>
        </div>

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-purple">
            <Wallet size={24} />
          </div>

          <div>
            <span>Chênh lệch</span>
            <h2>
              {formatMoney(
                summary.totalReward - summary.totalPenalty
              )}
            </h2>
            <small>Thưởng trừ phạt</small>
          </div>
        </div>

      </div>

      {/* SEARCH + FILTER */}
      <div className="reward-toolbar">

        <div className="reward-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Tìm tên, mã nhân viên hoặc lý do..."
            value={keyword}
            onChange={(event) =>
              setKeyword(event.target.value)
            }
          />
        </div>

        <select
          value={filterType}
          onChange={(event) =>
            setFilterType(event.target.value)
          }
          aria-label="Lọc hình thức"
        >
          <option value="Tất cả">
            Tất cả hình thức
          </option>

          <option value="Thưởng">Thưởng</option>
          <option value="Phạt">Phạt</option>
        </select>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            fetchRecords();
            fetchRewardEmployees();
          }}
          disabled={loading || employeesLoading}
        >
          <RefreshCw
            size={15}
            className={
              loading ? "reward-spinning" : ""
            }
          />
          Làm mới
        </button>

      </div>

      {/* RECORDS TABLE */}
      <div className="responsive-table">
        <table className="manager-table">

          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Hình thức</th>
              <th>Số tiền</th>
              <th>Lý do</th>
              <th>Ngày áp dụng</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="6"
                  className="empty-state"
                >
                  Đang tải dữ liệu thưởng phạt...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="empty-state"
                >
                  Chưa có quyết định thưởng phạt nào.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const employeeName =
                  record.employee?.name ||
                  record.employeeName ||
                  "Nhân viên";

                const employeeCode =
                  record.employee?.employeeCode ||
                  record.employeeCode ||
                  "Chưa có mã";

                return (
                  <tr key={record._id}>

                    <td>
                      <div className="reward-employee-cell">
                        <strong>{employeeName}</strong>
                        <small>{employeeCode}</small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          record.type === "Thưởng"
                            ? "approved"
                            : "rejected"
                        }`}
                      >
                        {record.type}
                      </span>
                    </td>

                    <td>
                      <strong
                        className={
                          record.type === "Thưởng"
                            ? "reward-money"
                            : "penalty-money"
                        }
                      >
                        {formatMoney(record.amount)}
                      </strong>
                    </td>

                    <td className="reward-reason">
                      {record.reason}
                    </td>

                    <td>
                      <span className="reward-date">
                        <CalendarDays size={14} />
                        {formatDate(record.date)}
                      </span>
                    </td>

                    <td>
                      <div className="reward-actions">

                        <button
                          type="button"
                          className="reward-edit-btn"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa quyết định của ${employeeName}`}
                          onClick={() => openEditForm(record)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="reward-delete-btn"
                          title="Xóa"
                          aria-label={`Xóa quyết định của ${employeeName}`}
                          onClick={() => handleDelete(record)}
                        >
                          <Trash2 size={15} />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {/* PHÂN TRANG */}
      {!loading && filteredRecords.length > 0 && (
        <div className="reward-pagination">

          <div className="reward-pagination-info">
            Đang xem{" "}
            <strong>
              {displayedFrom}–{displayedTo}
            </strong>{" "}
            trên tổng{" "}
            <strong>{filteredRecords.length}</strong>{" "}
            quyết định
          </div>

          <div className="reward-pagination-controls">

            <button
              type="button"
              className="reward-page-btn"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              Trang trước
            </button>

            <div className="reward-page-numbers">
              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`reward-page-number ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="reward-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Trang sau
            </button>

          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <div
          className="manager-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <form
            className="manager-modal reward-modal"
            onSubmit={saveRecord}
          >

            <div className="reward-modal-heading">
              <div>
                <h2>
                  {editingId
                    ? "Chỉnh sửa quyết định"
                    : "Thêm quyết định thưởng / phạt"}
                </h2>

                <p>
                  Nhập đầy đủ thông tin quyết định nhân sự
                </p>
              </div>

              <button
                type="button"
                className="reward-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Đóng biểu mẫu"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div
                className="reward-message error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* EMPLOYEE SEARCH */}
            <label className="reward-employee-field">
              Nhân viên

              <div className="reward-employee-search-select">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder={
                    employeesLoading
                      ? "Đang tải danh sách nhân viên..."
                      : "Tìm theo tên, mã, phòng ban, chức vụ..."
                  }
                  value={
                    showEmployeeDropdown
                      ? employeeSearch
                      : selectedRewardEmployee
                        ? `${selectedRewardEmployee.name}${
                            selectedRewardEmployee.employeeCode
                              ? ` - ${selectedRewardEmployee.employeeCode}`
                              : ""
                          }`
                        : employeeSearch
                  }
                  disabled={employeesLoading}
                  onFocus={() => {
                    setEmployeeSearch("");
                    setShowEmployeeDropdown(true);
                  }}
                  onChange={(event) => {
                    const value = event.target.value;

                    setEmployeeSearch(value);
                    setShowEmployeeDropdown(true);

                    setForm((previous) => ({
                      ...previous,
                      employeeId: "",
                    }));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setShowEmployeeDropdown(false);
                    }
                  }}
                  aria-expanded={showEmployeeDropdown}
                  aria-controls="reward-employee-options"
                />

                {showEmployeeDropdown && !employeesLoading && (
                  <div
                    className="reward-employee-dropdown"
                    id="reward-employee-options"
                    role="listbox"
                  >
                    {filteredRewardEmployees.length > 0 ? (
                      filteredRewardEmployees.map((employee) => (
                        <button
                          type="button"
                          key={employee._id}
                          className="reward-employee-option"
                          role="option"
                          aria-selected={
                            String(form.employeeId) ===
                            String(employee._id)
                          }
                          onClick={() => {
                            setForm((previous) => ({
                              ...previous,
                              employeeId: employee._id,
                            }));

                            setEmployeeSearch("");
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          <strong>{employee.name}</strong>

                          <small>
                            {employee.employeeCode || "Chưa có mã"}

                            {employee.department
                              ? ` • ${employee.department}`
                              : ""}

                            {employee.position || employee.jobTitle
                              ? ` • ${
                                  employee.position ||
                                  employee.jobTitle
                                }`
                              : ""}

                            {employee.role === "accountant"
                              ? " • Kế toán"
                              : ""}
                          </small>
                        </button>
                      ))
                    ) : (
                      <div className="reward-employee-empty">
                        Không tìm thấy nhân viên phù hợp.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!form.employeeId && (
                <small>
                  Vui lòng tìm kiếm và chọn một nhân viên.
                </small>
              )}

              {!employeesLoading &&
                activeEmployees.length === 0 && (
                  <small>
                    Không có nhân viên hoặc kế toán đang
                    hoạt động để lựa chọn.
                  </small>
                )}
            </label>

            {/* TYPE */}
            <label>
              Hình thức

              <select
                value={form.type}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    type: event.target.value,
                  }))
                }
              >
                <option value="Thưởng">Thưởng</option>
                <option value="Phạt">Phạt</option>
              </select>
            </label>

            {/* AMOUNT */}
            <label>
              Số tiền (VNĐ)

              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="Ví dụ: 500000"
                value={form.amount}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    amount: event.target.value,
                  }))
                }
              />

              <small>
                Nhập số tiền bằng VNĐ, không cần dấu chấm
                hoặc dấu phẩy.
              </small>
            </label>

            {/* DATE */}
            <label>
              Ngày áp dụng

              <input
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    date: event.target.value,
                  }))
                }
              />
            </label>

            {/* REASON */}
            <label>
              Lý do

              <textarea
                rows="4"
                required
                maxLength="1000"
                placeholder="Nhập lý do thưởng hoặc phạt..."
                value={form.reason}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    reason: event.target.value,
                  }))
                }
              />
            </label>

            {/* ACTIONS */}
            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="primary-btn"
                type="submit"
                disabled={
                  saving ||
                  employeesLoading ||
                  activeEmployees.length === 0
                }
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Cập nhật quyết định"
                    : "Lưu quyết định"}
              </button>

            </div>

          </form>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          className="manager-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="manager-modal reward-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-delete-title"
          >

            <div className="reward-delete-icon">
              <Trash2 size={25} />
            </div>

            <h2 id="reward-delete-title">
              Xác nhận xóa quyết định?
            </h2>

            <p>
              Bạn có chắc chắn muốn xóa quyết định{" "}
              <strong>
                {String(deleteTarget.type || "").toLowerCase()}
              </strong>{" "}
              của{" "}
              <strong>
                {deleteTarget.employee?.name ||
                  deleteTarget.employeeName ||
                  "nhân viên"}
              </strong>
              ?
            </p>

            <p className="reward-delete-warning">
              Thao tác này không thể hoàn tác.
            </p>

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-btn"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="reward-confirm-delete-btn"
                disabled={deleting}
                onClick={confirmDeleteReward}
              >
                {deleting
                  ? "Đang xóa..."
                  : "Xác nhận xóa"}
              </button>

            </div>

          </div>
        </div>
      )}

    </section>
  );
}

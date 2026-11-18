
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

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const createEmptyForm = () => ({
  employeeId: "",
  type: "Thưởng",
  amount: "",
  reason: "",
  date: getToday(),
});

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

export default function ManagerRewards({ employees = [] }) {
  const [records, setRecords] = useState([]);

  const [summary, setSummary] = useState({
    totalReward: 0,
    totalPenalty: 0,
    rewardCount: 0,
    penaltyCount: 0,
    totalRecords: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(createEmptyForm);
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");

  // ======================================
  // GỌI API
  // ======================================
  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
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

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Không thể thực hiện yêu cầu.");
    }

    return data;
  }, []);

  // ======================================
  // TẢI DANH SÁCH THƯỞNG PHẠT
  // ======================================
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/rewards/manager");

      setRecords(
        Array.isArray(data.records) ? data.records : []
      );

      setSummary({
        totalReward: Number(data.summary?.totalReward || 0),
        totalPenalty: Number(data.summary?.totalPenalty || 0),
        rewardCount: Number(data.summary?.rewardCount || 0),
        penaltyCount: Number(data.summary?.penaltyCount || 0),
        totalRecords: Number(
          data.summary?.totalRecords ??
            data.records?.length ??
            0
        ),
      });
    } catch (err) {
      console.error("Fetch rewards error:", err);
      setError(err.message || "Không thể tải dữ liệu thưởng phạt.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ======================================
  // DANH SÁCH NHÂN VIÊN
  // ======================================
  const activeEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.role !== "manager" &&
        employee.isActive !== false &&
        employee.status !== "resigned"
    );
  }, [employees]);

  // ======================================
  // TÌM KIẾM VÀ LỌC
  // ======================================
  const filteredRecords = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return records.filter((record) => {
      const employeeName =
        record.employee?.name || record.employeeName || "";

      const employeeCode =
        record.employee?.employeeCode ||
        record.employeeCode ||
        "";

      const matchesKeyword =
        !search ||
        employeeName.toLowerCase().includes(search) ||
        employeeCode.toLowerCase().includes(search) ||
        String(record.reason || "").toLowerCase().includes(search);

      const matchesType =
        filterType === "Tất cả" || record.type === filterType;

      return matchesKeyword && matchesType;
    });
  }, [records, keyword, filterType]);

  // ======================================
  // MỞ FORM THÊM
  // ======================================
  const openCreateForm = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ======================================
  // MỞ FORM CHỈNH SỬA
  // ======================================
  const openEditForm = (record) => {
    setEditingId(record._id);

    setForm({
      employeeId:
        record.employee?._id || record.employee || "",
      type: record.type,
      amount: String(record.amount),
      reason: record.reason || "",
      date: getInputDate(record.date),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  // ======================================
  // ĐÓNG FORM
  // ======================================
  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());
    setError("");
  };

  // ======================================
  // LƯU QUYẾT ĐỊNH
  // ======================================
  const saveRecord = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.employeeId) {
      setError("Vui lòng chọn nhân viên.");
      return;
    }

    if (
      form.amount === "" ||
      !Number.isFinite(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      setError("Số tiền phải là số lớn hơn 0.");
      return;
    }

    if (!Number.isSafeInteger(Number(form.amount))) {
      setError("Số tiền phải là số nguyên hợp lệ.");
      return;
    }

    if (!form.reason.trim()) {
      setError("Vui lòng nhập lý do thưởng hoặc phạt.");
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
        amount: Number(form.amount),
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

      setSuccess(
        data.message || "Lưu quyết định thành công."
      );

      await fetchRecords();
    } catch (err) {
      console.error("Save reward error:", err);
      setError(err.message || "Không thể lưu quyết định.");
    } finally {
      setSaving(false);
    }
  };

  // ======================================
  // XÓA QUYẾT ĐỊNH
  // ======================================
  const handleDelete = async (record) => {
    const employeeName =
      record.employee?.name ||
      record.employeeName ||
      "nhân viên";

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa quyết định ${record.type.toLowerCase()} của ${employeeName}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/rewards/manager/${record._id}`,
        { method: "DELETE" }
      );

      setSuccess(data.message || "Đã xóa quyết định.");

      await fetchRecords();
    } catch (err) {
      console.error("Delete reward error:", err);
      setError(err.message || "Không thể xóa quyết định.");
    }
  };

  // ======================================
  // GIAO DIỆN
  // ======================================
  return (
    <section className="manager-panel manager-rewards">

      {/* TIÊU ĐỀ */}
      <div className="panel-heading">
        <div>
          <h2>Quản lý thưởng & phạt</h2>
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

      {/* THÔNG BÁO */}
      {error && !showForm && (
        <div className="reward-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="reward-message success">
          {success}
        </div>
      )}

      {/* THỐNG KÊ */}
      <div className="reward-summary">

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-green">
            <Gift size={24} />
          </div>

          <div>
            <span>Tổng tiền thưởng</span>
            <h2>{formatMoney(summary.totalReward)}</h2>
            <small>{summary.rewardCount} quyết định</small>
          </div>
        </div>

        <div className="reward-summary-card">
          <div className="reward-summary-icon reward-icon-red">
            <AlertTriangle size={24} />
          </div>

          <div>
            <span>Tổng tiền phạt</span>
            <h2>{formatMoney(summary.totalPenalty)}</h2>
            <small>{summary.penaltyCount} quyết định</small>
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

      {/* TÌM KIẾM VÀ LỌC */}
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
          <option value="Tất cả">Tất cả hình thức</option>
          <option value="Thưởng">Thưởng</option>
          <option value="Phạt">Phạt</option>
        </select>

        <button
          type="button"
          className="secondary-btn"
          onClick={fetchRecords}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? "reward-spinning" : ""}
          />
          Làm mới
        </button>

      </div>

      {/* BẢNG DỮ LIỆU */}
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
                <td colSpan="6" className="empty-state">
                  Đang tải dữ liệu thưởng phạt...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  Chưa có quyết định thưởng phạt nào.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
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
                          onClick={() => openEditForm(record)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="reward-delete-btn"
                          title="Xóa"
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

      {/* FORM THÊM / SỬA */}
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
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="reward-message error">
                {error}
              </div>
            )}

            {/* NHÂN VIÊN */}
            <label>
              Nhân viên

              <select
                required
                value={form.employeeId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    employeeId: event.target.value,
                  }))
                }
              >
                <option value="">Chọn nhân viên</option>

                {activeEmployees.map((employee) => (
                  <option
                    key={employee._id || employee.id}
                    value={employee._id || employee.id}
                  >
                    {employee.name}
                    {employee.employeeCode
                      ? ` - ${employee.employeeCode}`
                      : ""}
                  </option>
                ))}
              </select>

              {activeEmployees.length === 0 && (
                <small>
                  Không có nhân viên đang hoạt động để lựa chọn.
                </small>
              )}
            </label>

            {/* HÌNH THỨC */}
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

            {/* SỐ TIỀN */}
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
                Nhập số tiền bằng VNĐ, không cần dấu chấm hoặc dấu phẩy.
              </small>
            </label>

            {/* NGÀY ÁP DỤNG */}
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

            {/* LÝ DO */}
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

            {/* NÚT */}
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
                disabled={saving || activeEmployees.length === 0}
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

    </section>
  );
}

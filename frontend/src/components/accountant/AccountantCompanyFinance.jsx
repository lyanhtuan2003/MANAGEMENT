import { useCallback, useEffect, useState } from "react";

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  X,
  CalendarDays,
  ArrowUpCircle,
  ArrowDownCircle,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import "./AccountantCompanyFinance.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api/company-transactions`;

// ========================================
// FORM MẶC ĐỊNH
// ========================================

const createEmptyForm = () => ({
  type: "income",
  content: "",
  amount: "",
  transactionDate: getLocalDateTime(),
});

// ========================================
// LẤY GIỜ LOCAL CHO INPUT
// ========================================

function getLocalDateTime(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return getLocalDateTime();
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

// ========================================
// TOKEN
// ========================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

// ========================================
// FORMAT TIỀN
// ========================================

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

// ========================================
// FORMAT NGÀY
// ========================================

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ========================================
// COMPONENT
// ========================================

export default function AccountantCompanyFinance() {
  const [transactions, setTransactions] = useState([]);

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form, setForm] = useState(createEmptyForm);

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // THÔNG BÁO
  // ========================================

  const showToast = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 3000);
  };

  // ========================================
  // GỌI API
  // ========================================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại."
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
        "Bạn không có quyền truy cập quản lý thu chi."
      );
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || "Không thể thực hiện yêu cầu."
      );
    }

    return data;
  }, []);

  // ========================================
  // TẢI DỮ LIỆU THU CHI
  // ========================================

  const fetchFinance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (fromDate) {
        params.set("from", fromDate);
      }

      if (toDate) {
        params.set("to", toDate);
      }

      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      if (keyword.trim()) {
        params.set("search", keyword.trim());
      }

      const query = params.toString();
      const suffix = query ? `?${query}` : "";

      const [transactionResponse, summaryResponse] =
        await Promise.all([
          apiRequest(`/${suffix}`),
          apiRequest("/summary"),
        ]);

      // Backend trả danh sách tại response.data
      const transactionList = Array.isArray(
        transactionResponse.data
      )
        ? transactionResponse.data
        : [];

      setTransactions(transactionList);

      // Backend trả thống kê tại summaryResponse.data
      const summaryData = summaryResponse.data || {};

      setSummary({
        totalIncome: Number(summaryData.totalIncome || 0),
        totalExpense: Number(summaryData.totalExpense || 0),
        balance: Number(
          summaryData.balance ??
            (
              Number(summaryData.totalIncome || 0) -
              Number(summaryData.totalExpense || 0)
            )
        ),
      });
    } catch (err) {
      console.error("Lỗi tải dữ liệu thu chi:", err);

      setError(
        err.message || "Không thể tải dữ liệu thu chi."
      );

      setTransactions([]);

      setSummary({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    apiRequest,
    keyword,
    typeFilter,
    fromDate,
    toDate,
    refreshKey,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchFinance();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [fetchFinance]);

  // ========================================
  // MỞ FORM THÊM
  // ========================================

  const openCreateForm = () => {
    setEditingTransaction(null);
    setForm(createEmptyForm());
    setShowForm(true);
  };

  // ========================================
  // MỞ FORM SỬA
  // ========================================

  const openEditForm = (transaction) => {
    setEditingTransaction(transaction);

    setForm({
      type: transaction.type || "income",
      content: transaction.content || "",
      amount: String(transaction.amount ?? ""),
      transactionDate: getLocalDateTime(
        transaction.transactionDate
      ),
    });

    setShowForm(true);
  };

  // ========================================
  // ĐÓNG FORM
  // ========================================

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingTransaction(null);
    setForm(createEmptyForm());
  };

  // ========================================
  // THAY ĐỔI INPUT
  // ========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ========================================
  // TẠO / CẬP NHẬT GIAO DỊCH
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.content.trim()) {
      showToast("Vui lòng nhập nội dung giao dịch.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Số tiền phải lớn hơn 0.");
      return;
    }

    if (!form.transactionDate) {
      showToast("Vui lòng chọn ngày giao dịch.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        type: form.type,
        content: form.content.trim(),
        amount,
        transactionDate: new Date(
          form.transactionDate
        ).toISOString(),
      };

      const isEditing = Boolean(editingTransaction);

      const transactionId =
        editingTransaction?._id || editingTransaction?.id;

      const endpoint = isEditing
        ? `/${transactionId}`
        : "/";

      await apiRequest(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setShowForm(false);
      setEditingTransaction(null);
      setForm(createEmptyForm());

      showToast(
        isEditing
          ? "Cập nhật giao dịch thành công."
          : "Tạo giao dịch thành công."
      );

      // Tải lại ngay sau khi lưu
      setRefreshKey((value) => value + 1);
    } catch (err) {
      console.error("Lỗi lưu giao dịch:", err);

      showToast(
        err.message || "Không thể lưu giao dịch."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <section className="accountant-finance">
      {/* TIÊU ĐỀ */}
      <div className="finance-heading">
        <div>
          <div className="finance-breadcrumb">
            Trang chủ / Quản lý thu chi
          </div>

          <h1>Quản lý thu chi công ty</h1>

          <p>
            Theo dõi tình hình tài chính và lịch sử giao dịch
            của công ty.
          </p>
        </div>

        <div className="finance-heading-actions">
          <button
            type="button"
            className="finance-refresh-btn"
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "finance-spinning" : ""}
            />
            Làm mới
          </button>

          <button
            type="button"
            className="finance-add-btn"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Tạo thu chi
          </button>
        </div>
      </div>

      {/* THỐNG KÊ */}
      <div className="finance-summary-grid">
        <div className="finance-summary-card">
          <div className="finance-summary-icon income">
            <TrendingUp size={24} />
          </div>

          <div>
            <span>Tổng thu</span>
            <strong>{formatMoney(summary.totalIncome)}</strong>
            <small>Tổng tiền công ty đã thu</small>
          </div>
        </div>

        <div className="finance-summary-card">
          <div className="finance-summary-icon expense">
            <TrendingDown size={24} />
          </div>

          <div>
            <span>Tổng chi</span>
            <strong>{formatMoney(summary.totalExpense)}</strong>
            <small>Tổng tiền công ty đã chi</small>
          </div>
        </div>

        <div className="finance-summary-card">
          <div className="finance-summary-icon balance">
            <Wallet size={24} />
          </div>

          <div>
            <span>Số dư</span>
            <strong>{formatMoney(summary.balance)}</strong>
            <small>Tổng thu trừ tổng chi</small>
          </div>
        </div>
      </div>

      {/* LỊCH SỬ */}
      <div className="finance-panel">
        <div className="finance-panel-heading">
          <div>
            <h2>Lịch sử giao dịch</h2>
            <p>
              Danh sách các khoản thu và chi của công ty.
            </p>
          </div>

          <span className="finance-count">
            {transactions.length} giao dịch
          </span>
        </div>

        {/* BỘ LỌC */}
        <div className="finance-toolbar">
          <div className="finance-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Tìm theo nội dung giao dịch..."
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
            />
          </div>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value)
            }
          >
            <option value="all">Tất cả giao dịch</option>
            <option value="income">Khoản thu</option>
            <option value="expense">Khoản chi</option>
          </select>

          <label className="finance-date-filter">
            <CalendarDays size={16} />
            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
              title="Từ ngày"
            />
          </label>

          <label className="finance-date-filter">
            <CalendarDays size={16} />
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) =>
                setToDate(event.target.value)
              }
              title="Đến ngày"
            />
          </label>
        </div>

        {error && (
          <div className="finance-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* BẢNG GIAO DỊCH */}
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Ngày giao dịch</th>
                <th>Nội dung</th>
                <th>Loại giao dịch</th>
                <th>Số tiền</th>
                <th>Người thực hiện</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="finance-empty">
                    <LoaderCircle
                      size={25}
                      className="finance-spinning"
                    />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="finance-empty">
                    <Wallet size={35} />
                    <strong>Chưa có giao dịch</strong>
                    <span>
                      Hãy tạo khoản thu hoặc chi đầu tiên.
                    </span>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const isIncome =
                    transaction.type === "income";

                  return (
                    <tr
                      key={
                        transaction._id || transaction.id
                      }
                    >
                      <td>
                        {formatDate(
                          transaction.transactionDate
                        )}
                      </td>

                      <td>
                        <div className="finance-content-cell">
                          <strong>
                            {transaction.content}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`finance-type ${
                            isIncome ? "income" : "expense"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpCircle size={15} />
                          ) : (
                            <ArrowDownCircle size={15} />
                          )}

                          {isIncome
                            ? "Khoản thu"
                            : "Khoản chi"}
                        </span>
                      </td>

                      <td>
                        <strong
                          className={
                            isIncome
                              ? "finance-amount-income"
                              : "finance-amount-expense"
                          }
                        >
                          {isIncome ? "+" : "-"}
                          {formatMoney(transaction.amount)}
                        </strong>
                      </td>

                      <td>
                        {transaction.updatedBy?.name ||
                          transaction.createdBy?.name ||
                          "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="finance-edit-btn"
                          title="Chỉnh sửa giao dịch"
                          onClick={() =>
                            openEditForm(transaction)
                          }
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="finance-no-delete-note">
          <AlertCircle size={15} />
          Giao dịch không thể xóa. Vui lòng chỉnh sửa nếu cần
          điều chỉnh thông tin.
        </div>
      </div>

      {/* FORM THÊM / SỬA */}
      {showForm && (
        <div
          className="finance-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <form
            className="finance-modal"
            onSubmit={handleSubmit}
          >
            <div className="finance-modal-header">
              <div>
                <h2>
                  {editingTransaction
                    ? "Chỉnh sửa giao dịch"
                    : "Tạo giao dịch mới"}
                </h2>

                <p>
                  Nhập thông tin khoản thu hoặc khoản chi.
                </p>
              </div>

              <button
                type="button"
                className="finance-close-btn"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={21} />
              </button>
            </div>

            <div className="finance-form-group">
              <label>Loại giao dịch *</label>

              <div className="finance-type-select">
                <button
                  type="button"
                  className={
                    form.type === "income"
                      ? "selected income"
                      : ""
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      type: "income",
                    }))
                  }
                >
                  <TrendingUp size={19} />
                  Khoản thu
                </button>

                <button
                  type="button"
                  className={
                    form.type === "expense"
                      ? "selected expense"
                      : ""
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      type: "expense",
                    }))
                  }
                >
                  <TrendingDown size={19} />
                  Khoản chi
                </button>
              </div>
            </div>

            <div className="finance-form-group">
              <label>Nội dung giao dịch *</label>

              <input
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Ví dụ: Thanh toán tiền điện tháng 11..."
                maxLength={500}
                required
              />
            </div>

            <div className="finance-form-grid">
              <div className="finance-form-group">
                <label>Số tiền (VNĐ) *</label>

                <input
                  name="amount"
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Nhập số tiền"
                  required
                />
              </div>

              <div className="finance-form-group">
                <label>Ngày giao dịch *</label>

                <input
                  name="transactionDate"
                  type="datetime-local"
                  value={form.transactionDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="finance-modal-actions">
              <button
                type="button"
                className="finance-cancel-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="finance-submit-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle
                      size={17}
                      className="finance-spinning"
                    />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    {editingTransaction
                      ? "Lưu thay đổi"
                      : "Tạo giao dịch"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* THÔNG BÁO */}
      {toast && (
        <div className="finance-toast success">
          <CheckCircle2 size={18} />
          <span>{toast}</span>

          <button
            type="button"
            onClick={() => setToast("")}
            aria-label="Đóng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Search,
  CalendarDays,
  Pencil,
  X,
  Save,
  LoaderCircle,
  AlertCircle,
  ReceiptText,
} from "lucide-react";

// ========================================
// API CONFIG
// ========================================
const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

const TRANSACTION_API = `${API_BASE_URL}/company-transactions`;

// ========================================
// LẤY TOKEN
// ========================================
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

// ========================================
// FORMAT TIỀN
// ========================================
const formatMoney = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

// ========================================
// FORMAT NGÀY GIỜ
// ========================================
const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ========================================
// LẤY NGÀY HIỆN TẠI CHO INPUT
// ========================================
const getLocalDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

// ========================================
// LẤY TÊN NGƯỜI TẠO
// ========================================
const getCreatorName = (transaction) => {
  if (transaction.createdBy?.name) {
    return transaction.createdBy.name;
  }

  if (typeof transaction.createdBy === "string") {
    return "Người dùng";
  }

  return "Không xác định";
};

// ========================================
// COMPONENT
// ========================================
export default function ManagerCompanyFinance() {
  // ======================================
  // STATE
  // ======================================
  const [transactions, setTransactions] = useState([]);

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeCount: 0,
    expenseCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    type: "income",
    content: "",
    amount: "",
    transactionDate: getLocalDateTime(),
  });

  // ======================================
  // HEADERS
  // ======================================
  const getHeaders = useCallback(() => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại."
      );
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  // ======================================
  // TẠO QUERY
  // ======================================
  const buildQuery = useCallback(
    (includeSearch = true) => {
      const params = new URLSearchParams();

      if (fromDate) {
        params.append("from", fromDate);
      }

      if (toDate) {
        params.append("to", toDate);
      }

      if (includeSearch && typeFilter) {
        params.append("type", typeFilter);
      }

      if (includeSearch && search.trim()) {
        params.append("search", search.trim());
      }

      return params.toString();
    },
    [fromDate, toDate, typeFilter, search]
  );

  // ======================================
  // LẤY LỊCH SỬ GIAO DỊCH
  // ======================================
  const fetchTransactions = useCallback(async () => {
    const query = buildQuery(true);

    const response = await fetch(
      `${TRANSACTION_API}${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Không thể tải lịch sử giao dịch."
      );
    }

    setTransactions(
      Array.isArray(result.data) ? result.data : []
    );
  }, [buildQuery, getHeaders]);

  // ======================================
  // LẤY TỔNG THU, TỔNG CHI, SỐ DƯ
  // ======================================
  const fetchSummary = useCallback(async () => {
    const query = buildQuery(false);

    const response = await fetch(
      `${TRANSACTION_API}/summary${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Không thể tải thống kê tài chính."
      );
    }

    setSummary({
      totalIncome: Number(result.data?.totalIncome) || 0,
      totalExpense: Number(result.data?.totalExpense) || 0,
      balance: Number(result.data?.balance) || 0,
      incomeCount: Number(result.data?.incomeCount) || 0,
      expenseCount: Number(result.data?.expenseCount) || 0,
    });
  }, [buildQuery, getHeaders]);

  // ======================================
  // TẢI TOÀN BỘ DỮ LIỆU
  // ======================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchTransactions(),
        fetchSummary(),
      ]);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tài chính:", err);

      setError(
        err.message || "Không thể tải dữ liệu tài chính."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions, fetchSummary]);

  // ======================================
  // TỰ ĐỘNG TẢI LẠI KHI LỌC
  // ======================================
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================
  // MỞ MODAL THÊM GIAO DỊCH
  // ======================================
  const openCreateModal = () => {
    setEditingId(null);

    setForm({
      type: "income",
      content: "",
      amount: "",
      transactionDate: getLocalDateTime(),
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // ======================================
  // MỞ MODAL SỬA GIAO DỊCH
  // ======================================
  const openEditModal = (transaction) => {
    const date = new Date(transaction.transactionDate);
    const offset = date.getTimezoneOffset() * 60000;

    setEditingId(transaction._id);

    setForm({
      type: transaction.type,
      content: transaction.content || "",
      amount: String(transaction.amount || ""),
      transactionDate: new Date(date.getTime() - offset)
        .toISOString()
        .slice(0, 16),
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  // ======================================
  // ĐÓNG MODAL
  // ======================================
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
  };

  // ======================================
  // THAY ĐỔI FORM
  // ======================================
  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================
  // THÊM / CẬP NHẬT GIAO DỊCH
  // ======================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.content.trim()) {
      setError("Vui lòng nhập nội dung giao dịch.");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }

    if (!form.transactionDate) {
      setError("Vui lòng chọn ngày giao dịch.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        type: form.type,
        content: form.content.trim(),
        amount,
        transactionDate: new Date(
          form.transactionDate
        ).toISOString(),
      };

      const isEditing = Boolean(editingId);

      const url = isEditing
        ? `${TRANSACTION_API}/${editingId}`
        : TRANSACTION_API;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể lưu giao dịch."
        );
      }

      setModalOpen(false);
      setEditingId(null);

      setSuccess(
        isEditing
          ? "Cập nhật giao dịch thành công."
          : "Thêm giao dịch thành công."
      );

      await loadData();
    } catch (err) {
      console.error("Lỗi lưu giao dịch:", err);

      setError(
        err.message || "Có lỗi xảy ra khi lưu giao dịch."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================
  // RENDER
  // ======================================
  return (
    <div className="company-finance">
      <style>{`
        .company-finance {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 100%;
          padding: 24px 24px 36px;
          color: #25324b;
          box-sizing: border-box;
        }

        .company-finance * {
          box-sizing: border-box;
        }

        .cf-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .cf-heading h2 {
          margin: 0 0 7px;
          font-size: 24px;
          font-weight: 750;
        }

        .cf-heading p {
          margin: 0;
          color: #8492ad;
          font-size: 13px;
        }

        .cf-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .cf-btn {
          border: 1px solid #e1e8f3;
          background: white;
          color: #50617e;
          border-radius: 10px;
          padding: 11px 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s;
        }

        .cf-btn:hover {
          background: #f4f7ff;
        }

        .cf-btn-primary {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .cf-btn-primary:hover {
          background: #1d4ed8;
          color: white;
        }

        .cf-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .cf-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .cf-stat {
          background: white;
          border: 1px solid #e7edf5;
          border-radius: 14px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
          box-shadow: 0 3px 12px rgba(30, 50, 90, .025);
        }

        .cf-stat-icon {
          width: 48px;
          height: 48px;
          min-width: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cf-stat-icon.income {
          color: #16a34a;
          background: #e9f8ef;
        }

        .cf-stat-icon.expense {
          color: #ef4444;
          background: #fff0f0;
        }

        .cf-stat-icon.balance {
          color: #2563eb;
          background: #edf4ff;
        }

        .cf-stat-label {
          color: #8794ad;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .cf-stat-value {
          font-size: clamp(18px, 2vw, 24px);
          font-weight: 750;
          word-break: break-word;
        }

        .cf-stat-note {
          color: #9aa6bb;
          font-size: 11px;
          margin-top: 5px;
        }

        .cf-card {
          background: white;
          border: 1px solid #e7edf5;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 20px;
          box-shadow: 0 3px 12px rgba(30, 50, 90, .025);
        }

        .cf-card-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .cf-card-heading h3 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .cf-card-heading p {
          margin: 0;
          color: #8a97ad;
          font-size: 12px;
        }

        .cf-count {
          background: #edf4ff;
          color: #2563eb;
          border-radius: 30px;
          padding: 7px 12px;
          font-size: 12px;
          white-space: nowrap;
        }

        .cf-filters {
          display: grid;
          grid-template-columns:
            minmax(180px, 1.7fr)
            minmax(145px, .7fr)
            repeat(2, minmax(135px, .6fr));
          gap: 10px;
          margin-bottom: 18px;
        }

        .cf-input-wrap {
          position: relative;
          min-width: 0;
        }

        .cf-input-wrap > svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .cf-input,
        .cf-select {
          width: 100%;
          min-width: 0;
          height: 43px;
          border: 1px solid #dfe6f1;
          border-radius: 9px;
          background: white;
          padding: 0 12px;
          color: #40516e;
          outline: none;
          font-size: 13px;
        }

        .cf-input.with-icon {
          padding-left: 38px;
        }

        .cf-input:focus,
        .cf-select:focus {
          border-color: #5790f5;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
        }

        .cf-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .cf-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 750px;
        }

        .cf-table th {
          background: #f6f8fc;
          color: #72819c;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          padding: 14px 12px;
          white-space: nowrap;
        }

        .cf-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #edf0f5;
          font-size: 12px;
          color: #52617b;
        }

        .cf-table tbody tr:hover {
          background: #fafcff;
        }

        .cf-type {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 30px;
          font-size: 11px;
          white-space: nowrap;
        }

        .cf-type.income {
          background: #eaf8ef;
          color: #159447;
        }

        .cf-type.expense {
          background: #fff0f0;
          color: #e23c3c;
        }

        .cf-amount {
          font-weight: 750;
          white-space: nowrap;
        }

        .cf-amount.income {
          color: #16a34a;
        }

        .cf-amount.expense {
          color: #ef4444;
        }

        .cf-edit-btn {
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 9px;
          background: #edf4ff;
          color: #2563eb;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .cf-edit-btn:hover {
          background: #dceaff;
        }

        .cf-empty {
          padding: 45px 15px !important;
          text-align: center;
          color: #91a0b8 !important;
        }

        .cf-empty svg {
          display: block;
          margin: 0 auto 12px;
          color: #a1afc5;
        }

        .cf-message {
          padding: 12px 14px;
          border-radius: 9px;
          margin-bottom: 16px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cf-error {
          color: #dc2626;
          background: #fff1f1;
          border: 1px solid #fee2e2;
        }

        .cf-success {
          color: #15803d;
          background: #effaf2;
          border: 1px solid #dcfce7;
        }

        .cf-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 35px;
          color: #71809a;
          font-size: 13px;
        }

        .cf-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, .45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .cf-modal {
          width: 100%;
          max-width: 480px;
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          max-height: 90vh;
          overflow-y: auto;
        }

        .cf-modal-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .cf-modal-heading h3 {
          margin: 0;
          font-size: 19px;
        }

        .cf-close {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 8px;
          background: #f1f5f9;
          cursor: pointer;
          color: #64748b;
        }

        .cf-form-group {
          margin-bottom: 17px;
        }

        .cf-form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 650;
          color: #475569;
        }

        .cf-form-group .cf-input,
        .cf-form-group .cf-select {
          height: 45px;
        }

        .cf-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }

        @media (max-width: 900px) {
          .company-finance {
            padding: 22px 20px 32px;
          }

          .cf-filters {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .company-finance {
            padding: 18px 14px 28px;
          }

          .cf-stats {
            grid-template-columns: 1fr;
          }

          .cf-filters {
            grid-template-columns: 1fr;
          }

          .cf-card {
            padding: 15px;
          }

          .cf-heading h2 {
            font-size: 21px;
          }

          .cf-actions {
            width: 100%;
          }

          .cf-actions button {
            flex: 1;
          }
        }
      `}</style>

      {/* ==================================
          TIÊU ĐỀ
      ================================== */}
      <div className="cf-heading">
        <div>
          <h2>Quản lý thu chi công ty</h2>
          <p>
            Theo dõi tình hình tài chính và lịch sử giao dịch của công ty.
          </p>
        </div>

        <div className="cf-actions">
          <button
            type="button"
            className="cf-btn"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>

          <button
            type="button"
            className="cf-btn cf-btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Tạo thu chi
          </button>
        </div>
      </div>

      {/* ==================================
          THÔNG BÁO
      ================================== */}
      {error && !modalOpen && (
        <div className="cf-message cf-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="cf-message cf-success">
          <AlertCircle size={17} />
          {success}

          <button
            type="button"
            onClick={() => setSuccess("")}
            style={{
              marginLeft: "auto",
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ==================================
          THỐNG KÊ
      ================================== */}
      <div className="cf-stats">
        <div className="cf-stat">
          <div className="cf-stat-icon income">
            <TrendingUp size={25} />
          </div>

          <div>
            <div className="cf-stat-label">Tổng thu</div>

            <div className="cf-stat-value">
              {formatMoney(summary.totalIncome)}
            </div>

            <div className="cf-stat-note">
              {summary.incomeCount} khoản thu
            </div>
          </div>
        </div>

        <div className="cf-stat">
          <div className="cf-stat-icon expense">
            <TrendingDown size={25} />
          </div>

          <div>
            <div className="cf-stat-label">Tổng chi</div>

            <div className="cf-stat-value">
              {formatMoney(summary.totalExpense)}
            </div>

            <div className="cf-stat-note">
              {summary.expenseCount} khoản chi
            </div>
          </div>
        </div>

        <div className="cf-stat">
          <div className="cf-stat-icon balance">
            <Wallet size={25} />
          </div>

          <div>
            <div className="cf-stat-label">Số dư</div>

            <div className="cf-stat-value">
              {formatMoney(summary.balance)}
            </div>

            <div className="cf-stat-note">
              Tổng thu trừ tổng chi
            </div>
          </div>
        </div>
      </div>

      {/* ==================================
          LỊCH SỬ GIAO DỊCH
      ================================== */}
      <div className="cf-card">
        <div className="cf-card-heading">
          <div>
            <h3>Lịch sử giao dịch</h3>
            <p>
              Danh sách các khoản thu và chi của công ty.
            </p>
          </div>

          <span className="cf-count">
            {transactions.length} giao dịch
          </span>
        </div>

        {/* BỘ LỌC */}
        <div className="cf-filters">
          <div className="cf-input-wrap">
            <Search size={17} />

            <input
              className="cf-input with-icon"
              type="text"
              placeholder="Tìm theo nội dung giao dịch..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="cf-select"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Tất cả giao dịch</option>
            <option value="income">Khoản thu</option>
            <option value="expense">Khoản chi</option>
          </select>

          <div className="cf-input-wrap">
            <CalendarDays size={16} />

            <input
              className="cf-input with-icon"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div className="cf-input-wrap">
            <CalendarDays size={16} />

            <input
              className="cf-input with-icon"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        {loading ? (
          <div className="cf-loading">
            <LoaderCircle size={20} />
            Đang tải dữ liệu tài chính...
          </div>
        ) : (
          <div className="cf-table-wrap">
            <table className="cf-table">
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
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="cf-empty">
                      <ReceiptText size={38} />
                      Chưa có giao dịch nào.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td>
                        {formatDateTime(transaction.transactionDate)}
                      </td>

                      <td>
                        <strong>{transaction.content}</strong>
                      </td>

                      <td>
                        <span
                          className={`cf-type ${
                            transaction.type === "income"
                              ? "income"
                              : "expense"
                          }`}
                        >
                          {transaction.type === "income" ? (
                            <ArrowUpRight size={14} />
                          ) : (
                            <ArrowDownRight size={14} />
                          )}

                          {transaction.type === "income"
                            ? "Khoản thu"
                            : "Khoản chi"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`cf-amount ${
                            transaction.type === "income"
                              ? "income"
                              : "expense"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatMoney(transaction.amount)}
                        </span>
                      </td>

                      <td>
                        {getCreatorName(transaction)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="cf-edit-btn"
                          title="Chỉnh sửa giao dịch"
                          onClick={() => openEditModal(transaction)}
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            marginTop: 15,
            color: "#8b98ad",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <AlertCircle size={15} />

          Giao dịch không thể xóa. Bạn chỉ có thể chỉnh sửa nếu cần điều chỉnh thông tin.
        </div>
      </div>

      {/* ==================================
          MODAL THÊM / SỬA GIAO DỊCH
      ================================== */}
      {modalOpen && (
        <div
          className="cf-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="cf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cf-modal-title"
          >
            <div className="cf-modal-heading">
              <h3 id="cf-modal-title">
                {editingId
                  ? "Chỉnh sửa giao dịch"
                  : "Tạo giao dịch mới"}
              </h3>

              <button
                type="button"
                className="cf-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="cf-message cf-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="cf-form-group">
                <label>Loại giao dịch</label>

                <select
                  className="cf-select"
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="income">Khoản thu</option>
                  <option value="expense">Khoản chi</option>
                </select>
              </div>

              <div className="cf-form-group">
                <label>Nội dung giao dịch</label>

                <input
                  className="cf-input"
                  type="text"
                  name="content"
                  placeholder="Ví dụ: Thu tiền bán hàng..."
                  value={form.content}
                  onChange={handleFormChange}
                  maxLength={500}
                  required
                />
              </div>

              <div className="cf-form-group">
                <label>Số tiền (VNĐ)</label>

                <input
                  className="cf-input"
                  type="number"
                  name="amount"
                  placeholder="Nhập số tiền..."
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="cf-form-group">
                <label>Ngày và giờ giao dịch</label>

                <input
                  className="cf-input"
                  type="datetime-local"
                  name="transactionDate"
                  value={form.transactionDate}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="cf-modal-actions">
                <button
                  type="button"
                  className="cf-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="cf-btn cf-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editingId
                        ? "Lưu thay đổi"
                        : "Tạo giao dịch"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
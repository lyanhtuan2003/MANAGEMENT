
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Users,
  Gift,
  Wallet,
  RefreshCw,
  Search,
  Eye,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Banknote,
  Copy,
  History,
  CalendarClock,
} from "lucide-react";

import "./ManagerPayroll.css";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const numberFormat = (value) =>
  Number(value || 0).toLocaleString("vi-VN");

const formatDate = (value) => {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN");
};

function StatCard({ icon: Icon, title, value, color, note, isMoney = false }) {
  return (
    <div className="manager-stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div className="stat-content">
        <span>{title}</span>
        <h2>{isMoney ? money(value) : numberFormat(value)}</h2>
        <small>{note}</small>
      </div>
    </div>
  );
}

export default function ManagerPayroll() {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});

  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [createConfirmItem, setCreateConfirmItem] = useState(null);
  const [paymentConfirmItem, setPaymentConfirmItem] = useState(null);

  const [creatingId, setCreatingId] = useState("");
  const [payingId, setPayingId] = useState("");

  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ========================================
  // API REQUEST
  // ========================================

  const request = useCallback(async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.");
    }

    const { method = "GET", body, signal } = options;

    const response = await fetch(`${API_URL}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Lỗi máy chủ (${response.status}).`
      );
    }

    return result;
  }, []);

  // ========================================
  // LOAD PAYROLL
  // GET /api/payroll/manager
  // ========================================

  const loadPayroll = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const result = await request("/payroll/manager", { signal });

        if (signal?.aborted) return;

        const list = Array.isArray(result.payrolls)
          ? result.payrolls
          : [];

        setEmployees(list);
        setSummary(result.summary || {});

        setSelectedItem((current) => {
          if (!current) return null;

          const currentId = String(current.employee?._id || "");

          return (
            list.find(
              (item) => String(item.employee?._id || "") === currentId
            ) || null
          );
        });
      } catch (err) {
        if (err.name === "AbortError") return;

        setError(err.message || "Không thể tải dữ liệu bảng lương.");
        setEmployees([]);
        setSummary({});
        setSelectedItem(null);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [request]
  );

  useEffect(() => {
    const controller = new AbortController();

    loadPayroll(controller.signal);

    return () => controller.abort();
  }, [loadPayroll]);

  // ========================================
  // SEARCH + PAGINATION
  // ========================================

  const filteredEmployees = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return employees.filter((item) => {
      const employee = item.employee || {};

      const content = [
        employee.name,
        employee.employeeCode,
        employee.department,
        employee.position,
      ]
        .join(" ")
        .toLowerCase();

      return !search || content.includes(search);
    });
  }, [employees, keyword]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  const safeCurrentPage = Math.min(
    currentPage,
    Math.max(totalPages, 1)
  );

  const displayedFrom =
    filteredEmployees.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const displayedTo = Math.min(
    safeCurrentPage * pageSize,
    filteredEmployees.length
  );

  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;

    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safeCurrentPage]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  // ========================================
  // CREATE PAYROLL
  // POST /api/payroll/manager
  // ========================================

  const handleCreatePayroll = async (item) => {
    const employee = item.employee || {};
    const employeeId = employee._id;

    if (!employeeId) {
      setError("Không tìm thấy ID nhân viên.");
      return;
    }

    if (item.status === "draft" || item.payroll?._id) {
      setError("Nhân viên đã có bảng lương nháp chưa thanh toán.");
      return;
    }

    if (creatingId || payingId) return;

    try {
      setCreatingId(String(employeeId));
      setError("");
      setSuccess("");

      const result = await request("/payroll/manager", {
        method: "POST",
        body: {
          employeeId,
          allowance: 0,
          additionalDeduction: 0,
          note: "",
        },
      });

     setSuccess(
          result.message || `Đã tạo bảng lương cho ${employee.name || "nhân viên"}.`
        );

        setCreateConfirmItem(null);

      await loadPayroll();
    } catch (err) {
      setError(err.message || "Không thể tạo bảng lương.");
    } finally {
      setCreatingId("");
    }
  };

  // ========================================
  // PAYMENT CONFIRMATION
  // ========================================

  const handleMarkPaid = (item) => {
    const payrollId = item.payroll?._id;

    if (!payrollId) {
      setError("Không tìm thấy mã bảng lương nháp.");
      return;
    }

    if (item.status !== "draft") {
      setError("Bảng lương này không ở trạng thái chờ thanh toán.");
      return;
    }

    if (creatingId || payingId) return;

    setError("");
    setPaymentConfirmItem(item);
  };

  const confirmMarkPaid = async () => {
    const payrollId = paymentConfirmItem?.payroll?._id;

    if (!payrollId || payingId) return;

    try {
      setPayingId(String(payrollId));
      setError("");
      setSuccess("");

      const result = await request(
        `/payroll/manager/${payrollId}/pay`,
        { method: "PATCH" }
      );

      setSuccess(result.message || "Xác nhận thanh toán thành công.");
      setPaymentConfirmItem(null);

      await loadPayroll();
    } catch (err) {
      setError(err.message || "Không thể xác nhận thanh toán.");
    } finally {
      setPayingId("");
    }
  };

  // ========================================
  // EMPLOYEE PAYROLL HISTORY
  // GET /api/payroll/manager/:employeeId/history
  // ========================================

  const openHistory = async (employee) => {
    if (!employee?._id) {
      setError("Không tìm thấy mã nhân viên.");
      return;
    }

    try {
      setHistoryEmployee(employee);
      setHistoryRecords([]);
      setHistoryLoading(true);
      setError("");

      const result = await request(
        `/payroll/manager/${employee._id}/history`
      );

      setHistoryRecords(
        Array.isArray(result.history) ? result.history : []
      );
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử lương.");
      setHistoryEmployee(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    if (historyLoading) return;

    setHistoryEmployee(null);
    setHistoryRecords([]);
  };

  // ========================================
  // REFRESH / DETAIL / COPY
  // ========================================

  const handleRefresh = () => {
    setSuccess("");
    loadPayroll();
  };

  const openDetail = (item) => setSelectedItem(item);

  const closeDetail = () => setSelectedItem(null);

  const handleCopyBankAccount = async (accountNumber) => {
    if (!accountNumber) {
      setError("Nhân viên chưa cập nhật số tài khoản ngân hàng.");
      return;
    }

    try {
      await navigator.clipboard.writeText(accountNumber);
      setSuccess("Đã sao chép số tài khoản ngân hàng.");
      setError("");
    } catch {
      setError("Không thể sao chép. Vui lòng sao chép thủ công.");
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="manager-panel manager-data-page manager-payroll-page">
      <div className="manager-data-heading">
        <div>
          <h2>Quản lý bảng lương</h2>
          <p>
            Quản lý các đợt lập bảng lương, xác nhận thanh toán và theo dõi
            lịch sử lương nhân viên.
          </p>
        </div>

        <button
          type="button"
          className="manager-action-button primary"
          onClick={handleRefresh}
          disabled={loading || Boolean(creatingId) || Boolean(payingId)}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* SEARCH */}
      <div className="manager-filter-row">
        <div className="manager-search-filter">
          <Search size={17} />
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm tên, mã nhân viên, phòng ban..."
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="manager-error-message">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="manager-success-message">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {/* STATISTICS */}
      <div className="manager-stats">
        <StatCard
          icon={Users}
          title="Tổng nhân viên"
          value={summary.employeeCount}
          color="blue"
          note="Nhân viên đang hoạt động"
        />

        <StatCard
          icon={Clock}
          title="Bảng lương chờ trả"
          value={summary.totalDraft}
          color="orange"
          note="Đang chờ xác nhận thanh toán"
        />

        <StatCard
          icon={History}
          title="Tổng đợt đã thanh toán"
          value={summary.totalPaidHistory}
          color="green"
          note="Các đợt đã lưu lịch sử"
        />

        <StatCard
          icon={Wallet}
          title="Tổng tiền chờ trả"
          value={summary.unpaidAmount}
          color="purple"
          note="Tổng giá trị bảng nháp"
          isMoney
        />
      </div>

      {/* PAYROLL TABLE */}
      <div className="manager-table-section">
        <div className="panel-heading">
          <div>
            <h2>Bảng lương nhân viên</h2>
            <p>Danh sách bảng lương theo từng nhân viên</p>
          </div>

          <div className="manager-payroll-count">
            {filteredEmployees.length} nhân viên
          </div>
        </div>

        <div className="responsive-table">
          <table className="manager-table manager-payroll-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Lương cơ bản</th>
                <th>Phụ cấp</th>
                <th>Thưởng</th>
                <th>Phạt</th>
                <th>Khấu trừ bổ sung</th>
                <th>Tổng thực nhận</th>
                <th>Trạng thái</th>
                <th>Lịch sử</th>
                <th>Chi tiết</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" className="empty-state">
                    Đang tải dữ liệu bảng lương...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="12" className="empty-state">
                    Không tìm thấy nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((item, index) => {
                  const employee = item.employee || {};
                  const isDraft = item.status === "draft";
                  const employeeId = String(employee._id || "");
                  const payrollId = String(item.payroll?._id || "");

                  const isCreating = creatingId === employeeId;
                  const isPaying = payingId === payrollId;

                  return (
                    <tr key={employee._id || index}>
                      <td>
                        <div className="employee-cell">
                          <div className="avatar">
                            {(employee.name || "N")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{employee.name || "Chưa cập nhật"}</strong>
                            <small>
                              {employee.employeeCode || "Chưa có mã"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{employee.department || "—"}</td>

                      <td className="manager-money-basic">
                        {money(item.basicSalary)}
                      </td>

                      <td className="manager-money-positive">
                        +{money(item.allowance)}
                      </td>

                      <td className="manager-money-positive">
                        +{money(item.bonus)}
                      </td>

                      <td className="manager-money-negative">
                        -{money(item.penalty)}
                      </td>

                      <td className="manager-money-negative">
                        -{money(item.additionalDeduction)}
                      </td>

                      <td className="manager-money-total">
                        {money(item.totalSalary)}
                      </td>

                      <td>
                        {isDraft ? (
                          <span className="manager-payroll-status draft">
                            <Clock size={14} />
                            Chờ thanh toán
                          </span>
                        ) : (
                          <span className="manager-payroll-status not-created">
                            Chưa tạo đợt mới
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="manager-icon-button"
                          title="Xem lịch sử lương"
                          onClick={() => openHistory(employee)}
                        >
                          <History size={17} />
                        </button>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="manager-icon-button"
                          title="Xem chi tiết lương"
                          onClick={() => openDetail(item)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>

                      <td>
                        {isDraft ? (
                          <button
                            type="button"
                            className="manager-action-button primary manager-payroll-pay-button"
                            disabled={
                              Boolean(creatingId) ||
                              Boolean(payingId) ||
                              loading
                            }
                            onClick={() => handleMarkPaid(item)}
                          >
                            <Banknote size={15} />
                            {isPaying ? "Đang xử lý..." : "Thanh toán"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="manager-action-button primary manager-create-payroll-button"
                            disabled={
                              Boolean(creatingId) ||
                              Boolean(payingId) ||
                              loading
                            }
                            onClick={() => {
                              setError("");
                              setCreateConfirmItem(item);
                            }}
                          >
                            <PlusCircle size={15} />
                            {isCreating ? "Đang tạo..." : "Tạo bảng lương"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="payroll-pagination">
            <div className="payroll-pagination-info">
              Đang xem <strong>{displayedFrom}–{displayedTo}</strong> trên tổng{" "}
              <strong>{filteredEmployees.length}</strong> nhân viên
            </div>

            <div className="payroll-pagination-controls">
              <button
                type="button"
                className="payroll-page-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => goToPage(safeCurrentPage - 1)}
              >
                Trang trước
              </button>

              <div className="payroll-page-numbers">
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`payroll-page-number ${
                      safeCurrentPage === page ? "active" : ""
                    }`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="payroll-page-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => goToPage(safeCurrentPage + 1)}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}

        <div className="manager-payroll-note">
          <AlertCircle size={16} />
          <span>
            Tổng thực nhận = Lương cơ bản + Phụ cấp + Thưởng - Phạt - Khấu
            trừ bổ sung. Hệ thống không tính lương theo tháng hoặc ngày công.
            Quản lý chủ động tạo và xác nhận từng đợt thanh toán.
          </span>
        </div>
      </div>

      {/* CREATE PAYROLL CONFIRMATION MODAL */}
{createConfirmItem && (
  <div
    className="manager-modal-backdrop manager-create-confirm-backdrop"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !creatingId
      ) {
        setCreateConfirmItem(null);
      }
    }}
  >
    <div
      className="manager-create-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-payroll-title"
    >
      <button
        type="button"
        className="manager-icon-button manager-create-confirm-close"
        aria-label="Đóng"
        disabled={Boolean(creatingId)}
        onClick={() => setCreateConfirmItem(null)}
      >
        <X size={18} />
      </button>

      <div className="manager-create-confirm-icon">
        <PlusCircle size={27} />
      </div>

      <div className="manager-create-confirm-label">
        XÁC NHẬN TẠO BẢNG LƯƠNG
      </div>

      <h3 id="create-payroll-title">
        Tạo đợt lương mới?
      </h3>

      <p className="manager-create-confirm-description">
        Bạn đang chuẩn bị tạo bảng lương cho nhân viên:
      </p>

      <div className="manager-create-confirm-employee">
        <div className="manager-create-confirm-avatar">
          {(createConfirmItem.employee?.name || "N")
            .trim()
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <strong>
            {createConfirmItem.employee?.name || "Nhân viên"}
          </strong>
          <small>
            {createConfirmItem.employee?.employeeCode || "Chưa có mã nhân viên"}
          </small>
        </div>
      </div>

      <div className="manager-create-confirm-summary">
        <div>
          <span>Lương cơ bản</span>
          <strong>{money(createConfirmItem.basicSalary)}</strong>
        </div>

        <div>
          <span>Phụ cấp</span>
          <strong className="positive">
            +{money(createConfirmItem.allowance)}
          </strong>
        </div>

        <div>
          <span>Thưởng</span>
          <strong className="positive">
            +{money(createConfirmItem.bonus)}
          </strong>
        </div>

        <div>
          <span>Phạt</span>
          <strong className="negative">
            -{money(createConfirmItem.penalty)}
          </strong>
        </div>

        <div>
          <span>Khấu trừ bổ sung</span>
          <strong className="negative">
            -{money(createConfirmItem.additionalDeduction)}
          </strong>
        </div>

        <div className="manager-create-confirm-total">
          <span>TỔNG THỰC NHẬN</span>
          <strong>{money(createConfirmItem.totalSalary)}</strong>
        </div>
      </div>

      <div className="manager-create-confirm-warning">
        <AlertCircle size={17} />
        <span>
          Bảng lương sẽ được tạo từ mức lương hiện tại và các khoản
          thưởng/phạt chưa được thanh toán của nhân viên.
        </span>
      </div>

      <div className="manager-create-confirm-actions">
        <button
          type="button"
          className="manager-create-cancel"
          disabled={Boolean(creatingId)}
          onClick={() => setCreateConfirmItem(null)}
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          className="manager-create-submit"
          disabled={Boolean(creatingId) || Boolean(payingId)}
          onClick={() => handleCreatePayroll(createConfirmItem)}
        >
          <PlusCircle size={16} />
          {creatingId ? "Đang tạo..." : "Xác nhận tạo bảng lương"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* PAYMENT CONFIRMATION MODAL */}
      {paymentConfirmItem && (() => {
        const employee = paymentConfirmItem.employee || {};
        const bankInfo = employee.bankInfo || {};
        const hasBankInfo = Boolean(
          bankInfo.bankName ||
          bankInfo.accountNumber ||
          bankInfo.accountHolder ||
          bankInfo.branch
        );

        return (
          <div
            className="manager-modal-backdrop manager-payment-confirm-backdrop"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !payingId
              ) {
                setPaymentConfirmItem(null);
              }
            }}
          >
            <div
              className="manager-modal manager-payment-confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-confirm-title"
            >
              <div className="manager-payment-confirm-icon">
                <Banknote size={27} />
              </div>

              <button
                type="button"
                className="manager-icon-button manager-payment-confirm-close"
                aria-label="Đóng"
                disabled={Boolean(payingId)}
                onClick={() => setPaymentConfirmItem(null)}
              >
                <X size={18} />
              </button>

              <h3 id="payment-confirm-title">
                Xác nhận thanh toán lương
              </h3>

              <p className="manager-payment-confirm-description">
                Bạn đã chuyển khoản và muốn xác nhận thanh toán cho{" "}
                <strong>{employee.name || "nhân viên này"}</strong>?
              </p>

              <div className="manager-payment-bank">
                <div className="manager-payment-bank-heading">
                  <div className="manager-payment-bank-icon">
                    <Wallet size={19} />
                  </div>

                  <div>
                    <h4>Thông tin ngân hàng nhận lương</h4>
                    <p>Tài khoản ngân hàng của nhân viên</p>
                  </div>
                </div>

                {hasBankInfo ? (
                  <div className="manager-payment-bank-content">
                    <div className="manager-payment-bank-row">
                      <span>Ngân hàng</span>
                      <strong>{bankInfo.bankName || "Chưa cập nhật"}</strong>
                    </div>

                    <div className="manager-payment-bank-row">
                      <span>Chủ tài khoản</span>
                      <strong>
                        {bankInfo.accountHolder || "Chưa cập nhật"}
                      </strong>
                    </div>

                    <div className="manager-payment-bank-row">
                      <span>Số tài khoản</span>
                      <div className="manager-payment-account">
                        <strong>
                          {bankInfo.accountNumber || "Chưa cập nhật"}
                        </strong>

                        {bankInfo.accountNumber && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyBankAccount(bankInfo.accountNumber)
                            }
                          >
                            <Copy size={15} />
                            Sao chép
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="manager-payment-bank-row">
                      <span>Chi nhánh</span>
                      <strong>{bankInfo.branch || "Chưa cập nhật"}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="manager-payment-bank-empty">
                    <AlertCircle size={18} />
                    <div>
                      <strong>Chưa có thông tin ngân hàng</strong>
                      <p>
                        Nhân viên chưa cập nhật tài khoản nhận lương.
                        Vui lòng kiểm tra trước khi thanh toán.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="manager-payment-confirm-summary">
                <div>
                  <span>Đợt lương</span>
                  <strong>
                    {paymentConfirmItem.payroll?.batchNumber || "—"}
                  </strong>
                </div>

                <div>
                  <span>Mã nhân viên</span>
                  <strong>{employee.employeeCode || "—"}</strong>
                </div>

                <div className="manager-payment-confirm-total">
                  <span>Tổng thực nhận</span>
                  <strong>{money(paymentConfirmItem.totalSalary)}</strong>
                </div>
              </div>

              <p className="manager-payment-confirm-note">
                Chỉ xác nhận sau khi đã thực hiện chuyển tiền. Sau khi xác
                nhận, bảng lương sẽ được lưu vào lịch sử và các khoản thưởng/
                phạt liên quan sẽ được quyết toán.
              </p>

              <div className="manager-payment-confirm-actions">
                <button
                  type="button"
                  className="manager-payment-cancel"
                  disabled={Boolean(payingId)}
                  onClick={() => setPaymentConfirmItem(null)}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className="manager-payment-submit"
                  disabled={Boolean(payingId)}
                  onClick={confirmMarkPaid}
                >
                  {payingId ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Xác nhận đã thanh toán
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PAYROLL DETAIL MODAL */}
      {selectedItem && (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div className="manager-modal manager-payroll-detail">
            <div className="manager-modal-heading">
              <div>
                <h3>Chi tiết bảng lương</h3>
                <p>
                  {selectedItem.employee?.name || "Nhân viên"}
                  {" · "}
                  {selectedItem.employee?.employeeCode || ""}
                </p>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                onClick={closeDetail}
              >
                <X size={18} />
              </button>
            </div>

            <div className="manager-payroll-detail-info">
              <div>
                <span>Phòng ban</span>
                <strong>{selectedItem.employee?.department || "—"}</strong>
              </div>

              <div>
                <span>Chức vụ</span>
                <strong>{selectedItem.employee?.position || "—"}</strong>
              </div>

              <div>
                <span>Trạng thái</span>
                <strong>
                  {selectedItem.status === "draft"
                    ? "Chờ thanh toán"
                    : "Chưa tạo đợt mới"}
                </strong>
              </div>

              <div>
                <span>Số đợt đã thanh toán</span>
                <strong>{numberFormat(selectedItem.historyCount)}</strong>
              </div>
            </div>

            <h4>Chi tiết thu nhập</h4>

            <div className="manager-payroll-breakdown">
              <div>
                <span>Lương cơ bản</span>
                <strong>{money(selectedItem.basicSalary)}</strong>
              </div>

              <div>
                <span>Phụ cấp</span>
                <strong className="manager-money-positive">
                  +{money(selectedItem.allowance)}
                </strong>
              </div>

              <div>
                <span>Tiền thưởng</span>
                <strong className="manager-money-positive">
                  +{money(selectedItem.bonus)}
                </strong>
              </div>

              <div>
                <span>Tiền phạt</span>
                <strong className="manager-money-negative">
                  -{money(selectedItem.penalty)}
                </strong>
              </div>

              <div>
                <span>Khấu trừ bổ sung</span>
                <strong className="manager-money-negative">
                  -{money(selectedItem.additionalDeduction)}
                </strong>
              </div>

              <div className="manager-payroll-final">
                <span>TỔNG LƯƠNG THỰC NHẬN</span>
                <strong>{money(selectedItem.totalSalary)}</strong>
              </div>
            </div>

            {selectedItem.payroll?.rewardDetails?.length > 0 && (
              <>
                <h4>Chi tiết thưởng / phạt trong đợt này</h4>

                <div className="responsive-table">
                  <table className="manager-table">
                    <thead>
                      <tr>
                        <th>Loại</th>
                        <th>Lý do</th>
                        <th>Số tiền</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedItem.payroll.rewardDetails.map((record, index) => (
                        <tr key={record.rewardId || index}>
                          <td>{record.type || "—"}</td>
                          <td>{record.reason || "—"}</td>
                          <td>{money(record.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selectedItem.payroll?.note && (
              <div className="manager-payroll-note">
                <strong>Ghi chú:</strong>
                <span>{selectedItem.payroll.note}</span>
              </div>
            )}

            <div className="manager-payroll-modal-footer">
              <span>
                {selectedItem.status === "draft"
                  ? "Bảng lương đang chờ thanh toán"
                  : "Chưa tạo bảng lương nháp mới"}
              </span>

              <button
                type="button"
                className="manager-action-button primary"
                onClick={closeDetail}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE PAYROLL HISTORY MODAL */}
      {historyEmployee && (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeHistory();
          }}
        >
          <div className="manager-modal manager-payroll-detail">
            <div className="manager-modal-heading">
              <div>
                <h3>Lịch sử thanh toán lương</h3>
                <p>
                  {historyEmployee.name || "Nhân viên"}
                  {" · "}
                  {historyEmployee.employeeCode || ""}
                </p>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                disabled={historyLoading}
                onClick={closeHistory}
              >
                <X size={18} />
              </button>
            </div>

            {historyLoading ? (
              <div className="empty-state">
                Đang tải lịch sử thanh toán...
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="empty-state">
                Nhân viên chưa có lịch sử thanh toán lương.
              </div>
            ) : (
              <div className="manager-payroll-history-list">
                {historyRecords.map((record, index) => (
                  <div
                    className="manager-payroll-history-item"
                    key={record._id || index}
                  >
                    <div className="manager-payroll-history-heading">
                      <div>
                        <strong>
                          Đợt lương #{record.batchNumber || index + 1}
                        </strong>
                        <small>
                          <CalendarClock size={13} />
                          {formatDate(record.paidAt)}
                        </small>
                      </div>

                      <span className="manager-payroll-status paid">
                        <CheckCircle2 size={14} />
                        Đã thanh toán
                      </span>
                    </div>

                    <div className="manager-payroll-breakdown">
                      <div>
                        <span>Lương cơ bản</span>
                        <strong>{money(record.basicSalary)}</strong>
                      </div>

                      <div>
                        <span>Phụ cấp</span>
                        <strong className="manager-money-positive">
                          +{money(record.allowance)}
                        </strong>
                      </div>

                      <div>
                        <span>Thưởng</span>
                        <strong className="manager-money-positive">
                          +{money(record.bonus)}
                        </strong>
                      </div>

                      <div>
                        <span>Phạt</span>
                        <strong className="manager-money-negative">
                          -{money(record.penalty)}
                        </strong>
                      </div>

                      <div>
                        <span>Khấu trừ bổ sung</span>
                        <strong className="manager-money-negative">
                          -{money(record.additionalDeduction)}
                        </strong>
                      </div>

                      <div className="manager-payroll-final">
                        <span>ĐÃ THANH TOÁN</span>
                        <strong>{money(record.totalSalary)}</strong>
                      </div>
                    </div>

                    {record.paidBy && (
                      <p className="manager-payroll-history-paidby">
                        Người xác nhận:{" "}
                        {record.paidBy.name ||
                          record.paidBy.fullName ||
                          "Quản lý"}
                      </p>
                    )}

                    {record.note && (
                      <p className="manager-payroll-history-note">
                        Ghi chú: {record.note}
                      </p>
                    )}

                    {record.rewardDetails?.length > 0 && (
                      <details className="manager-payroll-history-rewards">
                        <summary>
                          Xem {record.rewardDetails.length} khoản thưởng/phạt
                        </summary>

                        <div className="responsive-table">
                          <table className="manager-table">
                            <thead>
                              <tr>
                                <th>Loại</th>
                                <th>Lý do</th>
                                <th>Số tiền</th>
                              </tr>
                            </thead>

                            <tbody>
                              {record.rewardDetails.map((reward, rewardIndex) => (
                                <tr key={reward.rewardId || rewardIndex}>
                                  <td>{reward.type || "—"}</td>
                                  <td>{reward.reason || "—"}</td>
                                  <td>{money(reward.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="manager-payroll-modal-footer">
              <span>{historyRecords.length} đợt thanh toán</span>

              <button
                type="button"
                className="manager-action-button primary"
                disabled={historyLoading}
                onClick={closeHistory}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

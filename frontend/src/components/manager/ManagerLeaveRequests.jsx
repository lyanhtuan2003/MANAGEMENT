
import { useMemo, useState } from "react";
import {
  Check,
  X,
  Search,
  RefreshCw,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import "./ManagerLeaveRequests.css";

// ========================================
// CẤU HÌNH API
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

// ========================================
// TOKEN
// ========================================

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken")
  );
};

// ========================================
// ĐỊNH DẠNG NGÀY
// ========================================

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  const dateString = date.toISOString().slice(0, 10);
  const [year, month, day] = dateString.split("-");

  return `${day}/${month}/${year}`;
};

// ========================================
// TRẠNG THÁI ĐƠN
// ========================================

const statusInfo = {
  pending: {
    label: "Chờ duyệt",
    className: "pending",
  },
  approved: {
    label: "Đã duyệt",
    className: "approved",
  },
  rejected: {
    label: "Từ chối",
    className: "rejected",
  },
};

// ========================================
// COMPONENT
// ========================================

export default function ManagerLeaveRequests({
  requests = [],
  onRefresh,
  loading = false,
  error: parentError = "",
}) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  const [rejectModal, setRejectModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [managerNote, setManagerNote] = useState("");

  // ========================================
  // THỐNG KÊ ĐƠN
  // ========================================

  const counts = useMemo(() => {
    return {
      total: requests.length,

      pending: requests.filter(
        (item) => item.status === "pending"
      ).length,

      approved: requests.filter(
        (item) => item.status === "approved"
      ).length,

      rejected: requests.filter(
        (item) => item.status === "rejected"
      ).length,
    };
  }, [requests]);

  // ========================================
  // TÌM KIẾM VÀ LỌC
  // ========================================

  const filteredRequests = useMemo(() => {
    const searchValue = keyword.trim().toLowerCase();

    return requests.filter((item) => {
      const searchableText = [
        item.employeeName,
        item.employeeCode,
        item.department,
        item.position,
        item.type,
        item.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesKeyword =
        !searchValue || searchableText.includes(searchValue);

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [requests, keyword, statusFilter]);
  // ========================================
  // PHÂN TRANG
  // ========================================

  const totalTransactions = filteredRequests.length;

  const totalPages = Math.ceil(totalTransactions / PAGE_SIZE);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredRequests.slice(
      startIndex,
      startIndex + PAGE_SIZE
    );
  }, [filteredRequests, currentPage]);

  const displayedFrom =
    totalTransactions === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const displayedTo = Math.min(
    currentPage * PAGE_SIZE,
    totalTransactions
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;

    setCurrentPage(page);
  };

  // ========================================
  // GỌI API DUYỆT / TỪ CHỐI ĐƠN
  // ========================================

  const reviewRequest = async (id, status, note = "") => {
    if (!id) {
      setError("Không tìm thấy mã đơn nghỉ phép.");
      return;
    }

    try {
      setProcessingId(id);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(
        `${API_URL}/api/leave/${id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            managerNote: note,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể xử lý đơn nghỉ phép."
        );
      }

      setRejectModal(null);
      setManagerNote("");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      console.error("Review leave request error:", err);

      setError(
        err.message || "Có lỗi xảy ra khi xử lý đơn."
      );
    } finally {
      setProcessingId("");
    }
  };

  // ========================================
  // DUYỆT ĐƠN
  // ========================================

// ========================================
// MỞ MODAL XÁC NHẬN DUYỆT ĐƠN
// ========================================

const handleApprove = (item) => {
  setError("");
  setApproveModal(item);
};

// ========================================
// XÁC NHẬN DUYỆT ĐƠN
// ========================================

const confirmApprove = async () => {
  if (!approveModal?._id) return;

  await reviewRequest(approveModal._id, "approved");
  setApproveModal(null);
};

  // ========================================
  // TỪ CHỐI ĐƠN
  // ========================================

  const handleReject = async (event) => {
    event.preventDefault();

    if (!managerNote.trim()) {
      setError("Vui lòng nhập lý do từ chối đơn.");
      return;
    }

    await reviewRequest(
      rejectModal._id,
      "rejected",
      managerNote.trim()
    );
  };

  // ========================================
  // LÀM MỚI
  // ========================================

  const handleRefresh = () => {
    setError("");

    if (typeof onRefresh === "function") {
      onRefresh();
    }
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <section className="manager-panel manager-leave-page">

      {/* HEADER */}

      <div className="manager-leave-heading">
        <div>
          <div className="manager-leave-title">
            <FileText size={19} />

            <h2>Quản lý đơn xin nghỉ</h2>
          </div>

          <p>
            Kiểm tra và phê duyệt yêu cầu nghỉ phép của nhân viên.
          </p>
        </div>

        <button
          type="button"
          className="leave-refresh-button"
          onClick={handleRefresh}
          disabled={loading || Boolean(processingId)}
        >
          <RefreshCw
            size={16}
            className={loading ? "leave-spin" : ""}
          />

          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* THỐNG KÊ */}

      <div className="manager-leave-stats">

        <div className="manager-leave-stat">
          <div className="manager-leave-stat-icon total">
            <FileText size={20} />
          </div>

          <div>
            <span>Tổng đơn</span>
            <strong>{counts.total}</strong>
          </div>
        </div>

        <div className="manager-leave-stat">
          <div className="manager-leave-stat-icon pending">
            <Clock size={20} />
          </div>

          <div>
            <span>Chờ duyệt</span>
            <strong>{counts.pending}</strong>
          </div>
        </div>

        <div className="manager-leave-stat">
          <div className="manager-leave-stat-icon approved">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Đã duyệt</span>
            <strong>{counts.approved}</strong>
          </div>
        </div>

        <div className="manager-leave-stat">
          <div className="manager-leave-stat-icon rejected">
            <XCircle size={20} />
          </div>

          <div>
            <span>Từ chối</span>
            <strong>{counts.rejected}</strong>
          </div>
        </div>

      </div>

      {/* BỘ LỌC */}

      <div className="manager-leave-toolbar">

        <div className="manager-leave-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Tìm nhân viên, mã nhân viên, lý do..."
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setCurrentPage(1);
            }}
          />

          {keyword && (
            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setCurrentPage(1);
              }}  
              aria-label="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <select
          className="manager-leave-select"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>

      </div>

      {/* THÔNG BÁO LỖI */}

      {(error || parentError) && (
        <div className="manager-leave-error">
          <AlertCircle size={17} />

          <span>{error || parentError}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* DANH SÁCH */}

      <div className="responsive-table manager-leave-table-wrapper">
        <table className="manager-table manager-leave-table">

          <thead>
            <tr>
              <th>NHÂN VIÊN</th>
              <th>LOẠI NGHỈ</th>
              <th>THỜI GIAN</th>
              <th>LÝ DO</th>
              <th>TRẠNG THÁI</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className="manager-leave-empty">
                    <RefreshCw size={25} className="leave-spin" />
                    <p>Đang tải danh sách đơn nghỉ phép...</p>
                  </div>
                </td>
              </tr>
            ) : filteredRequests.length > 0 ? (
              paginatedRequests.map((item) => {
                const status = statusInfo[item.status] || {
                  label: "Không xác định",
                  className: "pending",
                };

                const requestId = item._id;

                return (
                  <tr key={requestId}>

                    {/* NHÂN VIÊN */}

                    <td>
                      <div className="manager-leave-employee">
                        <div className="manager-leave-avatar">
                          {(item.employeeName || "N").charAt(0)}
                        </div>

                        <div>
                          <strong>
                            {item.employeeName || "Nhân viên"}
                          </strong>

                          <small>
                            {item.employeeCode || "Chưa có mã"}
                          </small>

                          {item.department && (
                            <small>{item.department}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* LOẠI NGHỈ */}

                    <td>
                      <span className="manager-leave-type">
                        {item.type}
                      </span>
                    </td>

                    {/* THỜI GIAN */}

                    <td>
                      <div className="manager-leave-date">
                        <strong>{formatDate(item.from)}</strong>

                        <small>
                          đến {formatDate(item.to)}
                        </small>
                      </div>
                    </td>

                    {/* LÝ DO */}

                    <td>
                      <div className="manager-leave-reason">
                        {item.reason || "Không có lý do"}
                      </div>
                    </td>

                    {/* TRẠNG THÁI */}

                    <td>
                      <span
                        className={`status-badge ${status.className}`}
                      >
                        {status.label}
                      </span>

                      {item.managerNote && (
                        <small className="manager-note-text">
                          Ghi chú: {item.managerNote}
                        </small>
                      )}
                    </td>

                    {/* THAO TÁC */}

                    <td>
                      {item.status === "pending" ? (
                        <div className="table-actions">

                          <button
                            type="button"
                            className="approve-action"
                            title="Duyệt đơn"
                            disabled={Boolean(processingId)}
                            onClick={() => handleApprove(item)}
                          >
                            <Check size={17} />
                          </button>

                          <button
                            type="button"
                            className="delete-action"
                            title="Từ chối đơn"
                            disabled={Boolean(processingId)}
                            onClick={() => {
                              setRejectModal(item);
                              setManagerNote("");
                              setError("");
                            }}
                          >
                            <X size={17} />
                          </button>

                        </div>
                      ) : (
                        <span className="muted-text">
                          Đã xử lý
                        </span>
                      )}

                      {processingId === requestId && (
                        <small className="manager-leave-processing">
                          Đang xử lý...
                        </small>
                      )}
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="manager-leave-empty">
                    <CalendarDays size={35} />

                    <strong>
                      {requests.length === 0
                        ? "Chưa có đơn xin nghỉ nào"
                        : "Không tìm thấy đơn phù hợp"}
                    </strong>

                    <p>
                      {requests.length === 0
                        ? "Các đơn nghỉ phép của nhân viên sẽ xuất hiện tại đây."
                        : "Thử thay đổi từ khóa tìm kiếm hoặc trạng thái lọc."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>


        {/* PHÂN TRANG */}
        {!loading && totalTransactions > 0 && (
          <div className="leave-pagination">
            <div className="leave-pagination-info">
              Đang xem{" "}
              <strong>
                {displayedFrom}–{displayedTo}
              </strong>
              {" "}trên tổng{" "}
              <strong>{totalTransactions}</strong>
              {" "}đơn nghỉ phép
            </div>

            <div className="leave-pagination-controls">
              <button
                type="button"
                className="leave-page-btn"
                disabled={currentPage === 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                Trang trước
              </button>

              <div className="leave-page-numbers">
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`leave-page-number ${
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
                className="leave-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                Trang sau
              </button>
            </div>
          </div>
        )}

{/* MODAL XÁC NHẬN DUYỆT ĐƠN */}
{approveModal && (
  <div
    className="manager-leave-confirm-overlay"
    onClick={() => {
      if (!processingId) {
        setApproveModal(null);
      }
    }}
  >
    <div
      className="manager-leave-confirm-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="leave-confirm-close"
        onClick={() => setApproveModal(null)}
        disabled={Boolean(processingId)}
        aria-label="Đóng"
      >
        <X size={19} />
      </button>

      <div className="leave-confirm-icon">
        <CheckCircle2 size={30} />
      </div>

      <h3>Xác nhận duyệt đơn</h3>

      <p className="leave-confirm-description">
        Bạn có chắc chắn muốn duyệt đơn nghỉ phép này không?
      </p>

      <div className="leave-confirm-employee">
        <div className="leave-confirm-avatar">
          {(approveModal.employeeName || "N").charAt(0)}
        </div>

        <div>
          <span>Nhân viên</span>
          <strong>
            {approveModal.employeeName || "Nhân viên"}
          </strong>
          <small>
            {approveModal.employeeCode || "Chưa có mã nhân viên"}
          </small>
        </div>
      </div>

      <div className="leave-confirm-info">
        <div>
          <span>Loại nghỉ</span>
          <strong>{approveModal.type || "--"}</strong>
        </div>

        <div>
          <span>Thời gian</span>
          <strong>
            {formatDate(approveModal.from)} -{" "}
            {formatDate(approveModal.to)}
          </strong>
        </div>

        <div>
          <span>Lý do</span>
          <strong>
            {approveModal.reason || "Không có lý do"}
          </strong>
        </div>
      </div>

      <div className="leave-confirm-actions">
        <button
          type="button"
          className="leave-confirm-cancel"
          onClick={() => setApproveModal(null)}
          disabled={Boolean(processingId)}
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          className="leave-confirm-approve"
          onClick={confirmApprove}
          disabled={Boolean(processingId)}
        >
          {processingId ? (
            <>
              <RefreshCw size={16} className="leave-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Check size={17} />
              Xác nhận duyệt
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

      {/* MODAL TỪ CHỐI */}

      {rejectModal && (
        <div
          className="manager-leave-modal-overlay"
          onClick={() => {
            if (!processingId) {
              setRejectModal(null);
            }
          }}
        >
          <form
            className="manager-leave-modal"
            onSubmit={handleReject}
            onClick={(event) => event.stopPropagation()}
          >

            <div className="manager-leave-modal-heading">
              <div>
                <h3>Từ chối đơn xin nghỉ</h3>

                <p>
                  Nhân viên:{" "}
                  <strong>
                    {rejectModal.employeeName}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRejectModal(null)}
                disabled={Boolean(processingId)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <label htmlFor="manager-reject-note">
              Lý do từ chối
            </label>

            <textarea
              id="manager-reject-note"
              rows="5"
              maxLength={1000}
              required
              placeholder="Nhập lý do từ chối đơn nghỉ phép..."
              value={managerNote}
              onChange={(event) => setManagerNote(event.target.value)}
            />

            <div className="manager-leave-note-count">
              {managerNote.length}/1000 ký tự
            </div>

            <div className="manager-leave-modal-actions">

              <button
                type="button"
                className="leave-cancel-button"
                onClick={() => setRejectModal(null)}
                disabled={Boolean(processingId)}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="leave-confirm-reject"
                disabled={Boolean(processingId) || !managerNote.trim()}
              >
                {processingId
                  ? "Đang xử lý..."
                  : "Xác nhận từ chối"}
              </button>

            </div>

          </form>
        </div>
      )}

    </section>
  );
}

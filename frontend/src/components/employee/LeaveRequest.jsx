
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CalendarDays,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
)
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const statusInfo = {
  pending: { label: "Chờ duyệt", className: "pending" },
  approved: { label: "Đã duyệt", className: "approved" },
  rejected: { label: "Từ chối", className: "rejected" },
};

export default function LeaveRequest() {
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "Nghỉ phép năm",
    from: "",
    to: "",
    reason: "",
  });

  // =====================================
  // LẤY ĐƠN NGHỈ PHÉP
  // =====================================

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(
        `${API_URL}/api/leave/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải đơn xin nghỉ."
        );
      }

      setRequests(
        Array.isArray(data.requests) ? data.requests : []
      );
    } catch (err) {
      setError(
        err.message || "Có lỗi khi tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // =====================================
  // GỬI ĐƠN
  // =====================================

  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.from || !form.to || !form.reason.trim()) {
      return;
    }

    if (form.to < form.from) {
      alert("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }

    try {
      setSubmitting(true);

      const token = getToken();

      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(`${API_URL}/api/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể gửi đơn.");
      }

      setForm({
        type: "Nghỉ phép năm",
        from: "",
        to: "",
        reason: "",
      });

      setShowModal(false);

      await fetchRequests();

    } catch (err) {
      alert(err.message || "Có lỗi khi gửi đơn.");
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================
  // HỘP THOẠI XÁC NHẬN XÓA
  // =====================================

  const openDeleteModal = (id) => {
    setSelectedDeleteId(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingId) return;

    setShowDeleteModal(false);
    setSelectedDeleteId(null);
  };

  // =====================================
  // XÓA ĐƠN
  // =====================================

  const deleteRequest = async () => {
    if (!selectedDeleteId) return;

    try {
      setDeletingId(selectedDeleteId);

      const token = getToken();

      if (!token) {
        throw new Error(
          "Không tìm thấy token. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(
        `${API_URL}/api/leave/${selectedDeleteId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể xóa đơn."
        );
      }

      setShowDeleteModal(false);
      setSelectedDeleteId(null);

      await fetchRequests();

    } catch (err) {
      alert(err.message || "Có lỗi khi xóa đơn.");
    } finally {
      setDeletingId("");
    }
  };

  // =====================================
  // GIAO DIỆN
  // =====================================

  return (
    <div className="employee-page leave-request-page">

      <style>{`

        .leave-request-page {
          width: 100%;
          min-width: 0;
        }

        .leave-request-page .employee-section-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .leave-request-page .employee-section-title h1 {
          margin: 0 0 6px;
          color: #172b4d;
          font-size: clamp(22px, 3vw, 28px);
        }

        .leave-request-page .employee-section-title p {
          margin: 0;
          color: #718096;
          font-size: 14px;
        }

        .leave-request-page .employee-panel {
          min-width: 0;
          background: #fff;
          border: 1px solid #e8edf4;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 18px rgba(22, 40, 70, .04);
        }

        .leave-request-page .employee-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }

        .leave-request-page .employee-panel-heading h2 {
          margin: 0 0 5px;
          color: #1d3557;
          font-size: 18px;
        }

        .leave-request-page .employee-panel-heading p {
          margin: 0;
          color: #8492a6;
          font-size: 13px;
        }

        /* TABLE DESKTOP */

        .leave-request-page .employee-table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .leave-request-page .employee-table {
          width: 100%;
          min-width: 850px;
          border-collapse: collapse;
        }

        .leave-request-page .employee-table th,
        .leave-request-page .employee-table td {
          padding: 13px 12px;
          text-align: left;
          vertical-align: middle;
          border-bottom: 1px solid #edf1f6;
          font-size: 13px;
        }

        .leave-request-page .employee-table th {
          color: #718096;
          background: #f7f9fc;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          white-space: nowrap;
        }

        .leave-request-page .employee-table td {
          color: #34445b;
        }

        /* TRẠNG THÁI */

        .leave-request-page .leave-status {
          display: inline-flex;
          align-items: center;
          border-radius: 20px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .leave-request-page .leave-status.pending {
          color: #a66a00;
          background: #fff4d6;
        }

        .leave-request-page .leave-status.approved {
          color: #16804a;
          background: #e5f7ed;
        }

        .leave-request-page .leave-status.rejected {
          color: #c0392b;
          background: #ffebea;
        }

        .leave-request-page .leave-manager-note {
          display: block;
          margin-top: 7px;
          color: #c0392b;
          line-height: 1.5;
          max-width: 240px;
          white-space: normal;
        }

        /* NÚT XÓA */

        .leave-request-page .leave-delete-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 0;
          border-radius: 8px;
          padding: 8px 10px;
          color: #c0392b;
          background: #fff0ef;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .leave-request-page .leave-delete-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .leave-request-page .leave-no-action {
          color: #9aa5b4;
          font-size: 12px;
        }

        .leave-request-page .leave-empty {
          text-align: center !important;
          padding: 34px 12px !important;
          color: #8794a7 !important;
        }

        .leave-request-page .leave-empty svg {
          color: #9aabc1;
        }

        .leave-request-page .leave-empty p {
          margin: 8px 0 0;
        }

        .leave-request-page .leave-api-error {
          padding: 12px 14px;
          margin-bottom: 15px;
          color: #b42318;
          background: #fff1f0;
          border: 1px solid #ffd5d2;
          border-radius: 10px;
          font-size: 13px;
        }

        /* MOBILE CARD */

        .leave-request-page .leave-mobile-list {
          display: none;
        }

        .leave-request-page .leave-mobile-card {
          border: 1px solid #e8edf4;
          border-radius: 13px;
          padding: 15px;
          background: #fff;
          min-width: 0;
        }

        .leave-request-page .leave-mobile-card + .leave-mobile-card {
          margin-top: 12px;
        }

        .leave-request-page .leave-mobile-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid #edf1f6;
        }

        .leave-request-page .leave-mobile-code {
          color: #23456d;
          font-size: 13px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .leave-request-page .leave-mobile-type {
          color: #6b7b90;
          font-size: 12px;
          margin-top: 4px;
        }

        .leave-request-page .leave-mobile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 13px;
          padding: 13px 0;
        }

        .leave-request-page .leave-mobile-field {
          min-width: 0;
        }

        .leave-request-page .leave-mobile-field.full {
          grid-column: 1 / -1;
        }

        .leave-request-page .leave-mobile-label {
          display: block;
          color: #8a97a8;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .leave-request-page .leave-mobile-value {
          color: #34445b;
          font-size: 13px;
          line-height: 1.55;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .leave-request-page .leave-mobile-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          border-top: 1px solid #edf1f6;
          padding-top: 12px;
        }

        /* MODAL TẠO ĐƠN */

        .leave-request-page .employee-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, .55);
          overflow-y: auto;
        }

        .leave-request-page .employee-modal {
          width: min(100%, 520px);
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          background: #fff;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 20px 60px rgba(0,0,0,.2);
        }

        .leave-request-page .employee-modal-header,
        .leave-request-page .employee-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .leave-request-page .employee-modal-header {
          margin-bottom: 20px;
        }

        .leave-request-page .employee-modal-header h2 {
          margin: 0 0 5px;
          color: #1d3557;
        }

        .leave-request-page .employee-modal-header p {
          margin: 0;
          color: #8492a6;
          font-size: 13px;
        }

        .leave-request-page .employee-modal-close {
          border: 0;
          background: #f1f4f8;
          color: #526174;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex: 0 0 auto;
        }

        .leave-request-page .employee-form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 16px;
        }

        .leave-request-page .employee-form-group label {
          color: #43536a;
          font-size: 13px;
          font-weight: 700;
        }

        .leave-request-page .employee-form-group input,
        .leave-request-page .employee-form-group select,
        .leave-request-page .employee-form-group textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 43px;
          padding: 10px 12px;
          border: 1px solid #dce3ec;
          border-radius: 9px;
          outline: none;
          color: #34445b;
          background: #fff;
          font: inherit;
          font-size: 14px;
        }

        .leave-request-page .employee-form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .leave-request-page .employee-form-group input:focus,
        .leave-request-page .employee-form-group select:focus,
        .leave-request-page .employee-form-group textarea:focus {
          border-color: #3986e8;
          box-shadow: 0 0 0 3px rgba(57,134,232,.12);
        }

        .leave-request-page .employee-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .leave-request-page .employee-modal-footer {
          justify-content: flex-end;
          padding-top: 4px;
        }

        .leave-request-page button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        /* HỘP THOẠI XÁC NHẬN XÓA */

        .leave-request-page .delete-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          animation: deleteFadeIn 0.2s ease;
        }

        .leave-request-page .delete-modal {
          width: 100%;
          max-width: 400px;
          padding: 30px 26px 24px;
          background: #fff;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: deleteSlideIn 0.25s ease;
        }

        .leave-request-page .delete-modal-icon {
          width: 66px;
          height: 66px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc3545;
          background: #fff0f1;
          border-radius: 50%;
        }

        .leave-request-page .delete-modal h2 {
          margin: 0 0 12px;
          color: #1e293b;
          font-size: 21px;
          font-weight: 700;
        }

        .leave-request-page .delete-modal p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }

        .leave-request-page .delete-modal p strong {
          color: #dc3545;
          font-weight: 600;
        }

        .leave-request-page .delete-modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 26px;
        }

        .leave-request-page .delete-modal-actions button {
          flex: 1;
          min-height: 44px;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .leave-request-page .delete-cancel-btn {
          color: #475569;
          background: #f1f5f9;
        }

        .leave-request-page .delete-cancel-btn:hover {
          background: #e2e8f0;
        }

        .leave-request-page .delete-confirm-btn {
          color: #fff;
          background: #dc3545;
        }

        .leave-request-page .delete-confirm-btn:hover {
          background: #c82333;
          transform: translateY(-1px);
        }

        .leave-request-page .delete-modal-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @keyframes deleteFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes deleteSlideIn {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* RESPONSIVE */

        @media (max-width: 760px) {
          .leave-request-page .employee-panel {
            padding: 15px;
          }

          .leave-request-page .employee-table-scroll {
            display: none;
          }

          .leave-request-page .leave-mobile-list {
            display: block;
          }
        }

        @media (max-width: 520px) {
          .leave-request-page .employee-section-title {
            align-items: stretch;
          }

          .leave-request-page .employee-section-title > button {
            width: 100%;
            justify-content: center;
          }

          .leave-request-page .employee-panel-heading {
            align-items: flex-start;
          }

          .leave-request-page .employee-panel-heading > button {
            flex: 0 0 auto;
          }

          .leave-request-page .employee-form-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .leave-request-page .employee-modal {
            padding: 17px;
          }

          .leave-request-page .employee-modal-footer {
            flex-direction: column-reverse;
          }

          .leave-request-page .employee-modal-footer button {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .leave-request-page .delete-modal {
            padding: 25px 18px 20px;
          }

          .leave-request-page .delete-modal-actions {
            flex-direction: column-reverse;
          }

          .leave-request-page .delete-modal-actions button {
            width: 100%;
          }
        }

      `}</style>

      {/* TIÊU ĐỀ */}

      <div className="employee-section-title">
        <div>
          <h1>Xin nghỉ phép</h1>
          <p>
            Tạo đơn và theo dõi trạng thái nghỉ phép của bạn.
          </p>
        </div>

        <button
          type="button"
          className="employee-primary-button"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Tạo đơn nghỉ
        </button>
      </div>

      {/* LỊCH SỬ ĐƠN */}

      <div className="employee-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Lịch sử đơn xin nghỉ</h2>
            <p>Các đơn nghỉ phép đã gửi.</p>
          </div>

          <button
            type="button"
            className="employee-secondary-button"
            onClick={fetchRequests}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        {error && (
          <div className="leave-api-error">
            {error}
          </div>
        )}

        {/* MOBILE: HIỂN THỊ DẠNG THẺ */}

        <div className="leave-mobile-list">
          {loading ? (
            <div className="leave-empty">
              Đang tải dữ liệu...
            </div>
          ) : requests.length > 0 ? (
            requests.map((item) => {
              const id = item._id || item.id;

              const status = statusInfo[item.status] || {
                label: "Không xác định",
                className: "pending",
              };

              return (
                <article
                  className="leave-mobile-card"
                  key={id}
                >
                  <div className="leave-mobile-card-top">
                    <div>
                      <div className="leave-mobile-code">
                        MÃ ĐƠN:{" "}
                        {String(id || "")
                          .slice(-8)
                          .toUpperCase() || "—"}
                      </div>

                      <div className="leave-mobile-type">
                        {item.type || "Chưa xác định"}
                      </div>
                    </div>

                    <span
                      className={`leave-status ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="leave-mobile-grid">
                    <div className="leave-mobile-field">
                      <span className="leave-mobile-label">
                        Từ ngày
                      </span>

                      <div className="leave-mobile-value">
                        {formatDate(item.from) || "—"}
                      </div>
                    </div>

                    <div className="leave-mobile-field">
                      <span className="leave-mobile-label">
                        Đến ngày
                      </span>

                      <div className="leave-mobile-value">
                        {formatDate(item.to) || "—"}
                      </div>
                    </div>

                    <div className="leave-mobile-field full">
                      <span className="leave-mobile-label">
                        Lý do nghỉ
                      </span>

                      <div className="leave-mobile-value">
                        {item.reason || "—"}
                      </div>
                    </div>

                    {item.status === "rejected" &&
                      item.managerNote && (
                        <div className="leave-mobile-field full">
                          <span className="leave-mobile-label">
                            Lý do từ chối
                          </span>

                          <div className="leave-mobile-value">
                            {item.managerNote}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="leave-mobile-footer">
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        className="leave-delete-button"
                        disabled={deletingId === id}
                        onClick={() => openDeleteModal(id)}
                      >
                        <Trash2 size={16} />

                        Xóa đơn
                      </button>
                    ) : (
                      <span className="leave-no-action">
                        Không thể xóa đơn đã xử lý
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="leave-empty">
              <CalendarDays size={32} />
              <p>Bạn chưa có đơn xin nghỉ nào.</p>
            </div>
          )}
        </div>

        {/* DESKTOP: BẢNG ĐẦY ĐỦ */}

        <div className="employee-table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                <th>MÃ ĐƠN</th>
                <th>LOẠI NGHỈ</th>
                <th>TỪ NGÀY</th>
                <th>ĐẾN NGÀY</th>
                <th>LÝ DO</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="leave-empty"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((item) => {
                  const id = item._id || item.id;

                  const status = statusInfo[item.status] || {
                    label: "Không xác định",
                    className: "pending",
                  };

                  return (
                    <tr key={id}>
                      <td>
                        {String(id || "")
                          .slice(-8)
                          .toUpperCase()}
                      </td>

                      <td>{item.type}</td>

                      <td>{formatDate(item.from)}</td>

                      <td>{formatDate(item.to)}</td>

                      <td>{item.reason}</td>

                      <td>
                        <span
                          className={`leave-status ${status.className}`}
                        >
                          {status.label}
                        </span>

                        {item.status === "rejected" &&
                          item.managerNote && (
                            <small className="leave-manager-note">
                              Lý do: {item.managerNote}
                            </small>
                          )}
                      </td>

                      <td>
                        {item.status === "pending" ? (
                          <button
                            type="button"
                            className="leave-delete-button"
                            disabled={deletingId === id}
                            onClick={() => openDeleteModal(id)}
                          >
                            <Trash2 size={16} />
                            Xóa đơn
                          </button>
                        ) : (
                          <span className="leave-no-action">
                            Không thể xóa
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="leave-empty"
                  >
                    <CalendarDays size={32} />
                    <p>Bạn chưa có đơn xin nghỉ nào.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TẠO ĐƠN */}

      {showModal && (
        <div
          className="employee-modal-overlay"
          onClick={() =>
            !submitting && setShowModal(false)
          }
        >
          <form
            className="employee-modal"
            onSubmit={submitRequest}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employee-modal-header">
              <div>
                <h2>Tạo đơn xin nghỉ</h2>
                <p>Vui lòng điền đầy đủ thông tin.</p>
              </div>

              <button
                type="button"
                className="employee-modal-close"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="employee-form-group">
              <label>Loại nghỉ phép</label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
              >
                <option>Nghỉ phép năm</option>
                <option>Nghỉ việc riêng</option>
                <option>Nghỉ không lương</option>
                <option>Nghỉ ốm</option>
              </select>
            </div>

            <div className="employee-form-grid">
              <div className="employee-form-group">
                <label>Từ ngày</label>

                <input
                  type="date"
                  required
                  value={form.from}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      from: e.target.value,
                      to:
                        form.to &&
                        form.to < e.target.value
                          ? ""
                          : form.to,
                    })
                  }
                />
              </div>

              <div className="employee-form-group">
                <label>Đến ngày</label>

                <input
                  type="date"
                  required
                  min={form.from || undefined}
                  value={form.to}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      to: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="employee-form-group">
              <label>Lý do nghỉ</label>

              <textarea
                required
                rows="4"
                maxLength={1000}
                placeholder="Nhập lý do xin nghỉ..."
                value={form.reason}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reason: e.target.value,
                  })
                }
              />
            </div>

            <div className="employee-modal-footer">
              <button
                type="button"
                className="employee-secondary-button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="employee-primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Đang gửi..."
                  : "Gửi đơn xin nghỉ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA ĐƠN */}

      {showDeleteModal && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="delete-modal-icon">
              <Trash2 size={28} />
            </div>

            <h2 id="delete-modal-title">
              Xác nhận xóa đơn?
            </h2>

            <p>
              Bạn có chắc chắn muốn xóa đơn nghỉ phép này không?
              <br />
              <strong>
                Hành động này không thể hoàn tác.
              </strong>
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-cancel-btn"
                disabled={!!deletingId}
                onClick={closeDeleteModal}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                disabled={!!deletingId}
                onClick={deleteRequest}
              >
                {deletingId
                  ? "Đang xóa..."
                  : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

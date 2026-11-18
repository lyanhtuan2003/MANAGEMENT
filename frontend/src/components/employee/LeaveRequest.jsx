
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
).replace(/\/api\/?$/, "").replace(/\/$/, "");

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
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "Nghỉ phép năm",
    from: "",
    to: "",
    reason: "",
  });

  // LẤY ĐƠN CỦA NHÂN VIÊN ĐANG ĐĂNG NHẬP
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(`${API_URL}/api/leave/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tải đơn xin nghỉ.");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || "Có lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // GỬI ĐƠN
  const submitRequest = async (e) => {
    e.preventDefault();

    if (!form.from || !form.to || !form.reason.trim()) {
      alert("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (form.to < form.from) {
      alert("Ngày kết thúc không được trước ngày bắt đầu.");
      return;
    }

    try {
      setSubmitting(true);

      const token = getToken();

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

      alert("Đã gửi đơn xin nghỉ thành công!");
    } catch (err) {
      alert(err.message || "Có lỗi khi gửi đơn.");
    } finally {
      setSubmitting(false);
    }
  };

  // XÓA ĐƠN ĐANG CHỜ DUYỆT
  const deleteRequest = async (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa đơn xin nghỉ này không?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/leave/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể xóa đơn.");
      }

      await fetchRequests();

      alert("Đã xóa đơn xin nghỉ thành công.");
    } catch (err) {
      alert(err.message || "Có lỗi khi xóa đơn.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="employee-page">
      {/* TIÊU ĐỀ */}
      <div className="employee-section-title">
        <div>
          <h1>Xin nghỉ phép</h1>
          <p>Tạo đơn và theo dõi trạng thái nghỉ phép của bạn.</p>
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
            Làm mới
          </button>
        </div>

        {error && (
          <div className="leave-api-error">
            {error}
          </div>
        )}

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
                  <td colSpan="7" className="leave-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((item) => {
                  const status =
                    statusInfo[item.status] || {
                      label: "Không xác định",
                      className: "pending",
                    };

                  return (
                    <tr key={item._id}>
                      <td>{item._id.slice(-8).toUpperCase()}</td>
                      <td>{item.type}</td>
                      <td>{formatDate(item.from)}</td>
                      <td>{formatDate(item.to)}</td>
                      <td>{item.reason}</td>

                      <td>
                        <span className={`leave-status ${status.className}`}>
                          {status.label}
                        </span>

                        {item.status === "rejected" && item.managerNote && (
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
                            disabled={deletingId === item._id}
                            onClick={() => deleteRequest(item._id)}
                          >
                            <Trash2 size={16} />
                            {deletingId === item._id ? "Đang xóa..." : "Xóa đơn"}
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
                  <td colSpan="7" className="leave-empty">
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
          onClick={() => setShowModal(false)}
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
              >
                <X size={20} />
              </button>
            </div>

            <div className="employee-form-group">
              <label>Loại nghỉ phép</label>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value })
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
                        form.to && form.to < e.target.value
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
                    setForm({ ...form, to: e.target.value })
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
                  setForm({ ...form, reason: e.target.value })
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
                {submitting ? "Đang gửi..." : "Gửi đơn xin nghỉ"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

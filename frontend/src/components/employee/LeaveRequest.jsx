import { useState } from "react";
import { Plus, CalendarDays, X } from "lucide-react";
import { leaveHistory } from "../../data/employeeData";

export default function LeaveRequest() {
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState(leaveHistory);

  const [form, setForm] = useState({
    type: "Nghỉ phép năm",
    from: "",
    to: "",
    reason: "",
  });

  const submitRequest = (e) => {
    e.preventDefault();

    if (form.to < form.from) {
      alert("Ngày kết thúc không được trước ngày bắt đầu!");
      return;
    }

    const newRequest = {
      id: `NP${String(requests.length + 1).padStart(3, "0")}`,
      ...form,
      status: "pending",
    };

    setRequests((prev) => [newRequest, ...prev]);

    setForm({
      type: "Nghỉ phép năm",
      from: "",
      to: "",
      reason: "",
    });

    setShowModal(false);
    alert("Đã tạo đơn xin nghỉ thành công!");
  };

  const statusLabel = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
  };

  return (
    <div className="employee-page">
      <div className="employee-section-title">
        <div>
          <h1>Xin nghỉ phép</h1>
          <p>Tạo đơn và theo dõi trạng thái nghỉ phép của bạn.</p>
        </div>

        <button
          className="employee-primary-button"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Tạo đơn nghỉ
        </button>
      </div>

      <div className="employee-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Lịch sử đơn xin nghỉ</h2>
            <p>Các đơn nghỉ phép đã gửi.</p>
          </div>
          <CalendarDays color="#3986e8" />
        </div>

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
              </tr>
            </thead>

            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.type}</td>
                  <td>{item.from}</td>
                  <td>{item.to}</td>
                  <td>{item.reason}</td>
                  <td>
                    <span className={`leave-status ${item.status}`}>
                      {statusLabel[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                    setForm({ ...form, from: e.target.value })
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
              >
                Hủy
              </button>

              <button
                type="submit"
                className="employee-primary-button"
              >
                Gửi đơn xin nghỉ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
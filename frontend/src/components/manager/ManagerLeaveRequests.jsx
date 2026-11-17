
import { Check, X } from "lucide-react";

export default function ManagerLeaveRequests({ requests, setRequests }) {
  const updateStatus = (id, status) => {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  };

  return (
    <section className="manager-panel">
      <div className="panel-heading">
        <div>
          <h2>Quản lý đơn xin nghỉ</h2>
          <p>Kiểm tra và phê duyệt yêu cầu nghỉ phép của nhân viên</p>
        </div>
      </div>

      <div className="responsive-table">
        <table className="manager-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Loại nghỉ</th>
              <th>Thời gian</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.employee}</strong>
                  <small className="block-text">{item.code}</small>
                </td>
                <td>{item.type}</td>
                <td>
                  {item.from}
                  <small className="block-text">đến {item.to}</small>
                </td>
                <td>{item.reason}</td>
                <td>
                  <span
                    className={`status-badge ${
                      item.status === "Đã duyệt"
                        ? "approved"
                        : item.status === "Từ chối"
                        ? "rejected"
                        : "pending"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.status === "Chờ duyệt" ? (
                    <div className="table-actions">
                      <button
                        className="approve-action"
                        title="Duyệt đơn"
                        onClick={() =>
                          updateStatus(item.id, "Đã duyệt")
                        }
                      >
                        <Check size={18} />
                      </button>
                      <button
                        className="delete-action"
                        title="Từ chối"
                        onClick={() => {
                          if (window.confirm("Từ chối đơn này?")) {
                            updateStatus(item.id, "Từ chối");
                          }
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <span className="muted-text">Đã xử lý</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

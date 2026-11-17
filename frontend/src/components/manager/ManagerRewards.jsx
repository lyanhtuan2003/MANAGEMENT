
import { useState } from "react";
import { Gift, AlertTriangle, Plus } from "lucide-react";

export default function ManagerRewards({ employees }) {
  const [records, setRecords] = useState([
    {
      id: 1,
      employee: "Nguyễn Văn An",
      type: "Thưởng",
      amount: 500000,
      reason: "Hoàn thành xuất sắc công việc",
      date: "15/11/2026",
    },
    {
      id: 2,
      employee: "Trần Thị Mai",
      type: "Phạt",
      amount: 200000,
      reason: "Đi muộn nhiều lần",
      date: "14/11/2026",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee: "",
    type: "Thưởng",
    amount: "",
    reason: "",
  });

  const saveRecord = (e) => {
    e.preventDefault();

    setRecords((prev) => [
      {
        ...form,
        id: Date.now(),
        amount: Number(form.amount),
        date: new Date().toLocaleDateString("vi-VN"),
      },
      ...prev,
    ]);

    setShowForm(false);
    setForm({
      employee: "",
      type: "Thưởng",
      amount: "",
      reason: "",
    });
  };

  return (
    <section className="manager-panel">
      <div className="panel-heading">
        <div>
          <h2>Quản lý thưởng & phạt</h2>
          <p>Ghi nhận thành tích và xử lý vi phạm nhân sự</p>
        </div>

        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Thêm quyết định
        </button>
      </div>

      <div className="reward-summary">
        <div>
          <Gift size={24} />
          <span>Tổng tiền thưởng</span>
          <h2>
            {records
              .filter((r) => r.type === "Thưởng")
              .reduce((sum, r) => sum + r.amount, 0)
              .toLocaleString("vi-VN")} đ
          </h2>
        </div>

        <div>
          <AlertTriangle size={24} />
          <span>Tổng tiền phạt</span>
          <h2>
            {records
              .filter((r) => r.type === "Phạt")
              .reduce((sum, r) => sum + r.amount, 0)
              .toLocaleString("vi-VN")} đ
          </h2>
        </div>
      </div>

      <div className="responsive-table">
        <table className="manager-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Hình thức</th>
              <th>Số tiền</th>
              <th>Lý do</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.employee}</strong></td>
                <td>
                  <span className={`status-badge ${
                    r.type === "Thưởng" ? "approved" : "rejected"
                  }`}>
                    {r.type}
                  </span>
                </td>
                <td>{r.amount.toLocaleString("vi-VN")} đ</td>
                <td>{r.reason}</td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="manager-modal-overlay">
          <form className="manager-modal" onSubmit={saveRecord}>
            <h2>Thêm quyết định thưởng / phạt</h2>

            <label>
              Nhân viên
              <select
                required
                value={form.employee}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}
              >
                <option value="">Chọn nhân viên</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </label>

            <label>
              Hình thức
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option>Thưởng</option>
                <option>Phạt</option>
              </select>
            </label>

            <label>
              Số tiền
              <input
                type="number"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>

            <label>
              Lý do
              <textarea
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
              <button className="primary-btn" type="submit">
                Lưu quyết định
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

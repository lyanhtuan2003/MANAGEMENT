
import { useState } from "react";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";

export default function ManagerEmployees({ employees, setEmployees }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: "",
    position: "",
    department: "Marketing",
    email: "",
    phone: "",
    salary: "",
    status: "Đang làm việc",
  });

  const filtered = employees.filter((emp) =>
    `${emp.name} ${emp.id} ${emp.department}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openForm = (emp = null) => {
    setEditing(emp);

    setForm(
      emp
        ? { ...emp, salary: String(emp.salary) }
        : {
            name: "",
            position: "",
            department: "Marketing",
            email: "",
            phone: "",
            salary: "",
            status: "Đang làm việc",
          }
    );

    setShowForm(true);
  };

  const saveEmployee = (e) => {
    e.preventDefault();

    if (editing) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editing.id
            ? { ...form, id: editing.id, salary: Number(form.salary) }
            : emp
        )
      );
    } else {
      setEmployees((prev) => [
        ...prev,
        {
          ...form,
          id: `NV${String(Date.now()).slice(-5)}`,
          salary: Number(form.salary),
        },
      ]);
    }

    setShowForm(false);
  };

  const deleteEmployee = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa nhân viên này?")) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    }
  };

  const formatMoney = (money) =>
    Number(money).toLocaleString("vi-VN") + " đ";

  return (
    <section className="manager-panel">
      <div className="panel-heading">
        <div>
          <h2>Danh sách nhân viên</h2>
          <p>Quản lý thông tin và trạng thái nhân sự</p>
        </div>

        <button className="primary-btn" onClick={() => openForm()}>
          <Plus size={18} /> Thêm nhân viên
        </button>
      </div>

      <div className="table-toolbar">
        <div className="manager-search table-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã nhân viên..."
          />
        </div>
        <span>{filtered.length} nhân viên</span>
      </div>

      <div className="responsive-table">
        <table className="manager-table">
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
              <th>Chức vụ</th>
              <th>Lương cơ bản</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="employee-cell">
                    <div className="avatar">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <strong>{emp.name}</strong>
                      <small>{emp.id}</small>
                    </div>
                  </div>
                </td>

                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{formatMoney(emp.salary)}</td>

                <td>
                  <span
                    className={`status-badge ${
                      emp.status === "Đang làm việc"
                        ? "approved"
                        : "pending"
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>

                <td>
                  <div className="table-actions">
                    <button
                      title="Xem chi tiết"
                      onClick={() =>
                        window.alert(
                          `${emp.name}\n${emp.email}\n${emp.phone}`
                        )
                      }
                    >
                      <Eye size={17} />
                    </button>

                    <button
                      title="Chỉnh sửa"
                      onClick={() => openForm(emp)}
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      className="delete-action"
                      title="Xóa"
                      onClick={() => deleteEmployee(emp.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">
                  Không tìm thấy nhân viên
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="manager-modal-overlay">
          <form className="manager-modal" onSubmit={saveEmployee}>
            <h2>{editing ? "Cập nhật nhân viên" : "Thêm nhân viên"}</h2>

            <div className="manager-form-grid">
              {[
                ["name", "Họ và tên"],
                ["position", "Chức vụ"],
                ["email", "Email"],
                ["phone", "Số điện thoại"],
                ["salary", "Lương cơ bản"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    type={key === "salary" ? "number" : "text"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </label>
              ))}

              <label>
                Phòng ban
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                >
                  {["Marketing", "Kế toán", "Nhân sự", "Kỹ thuật"].map(
                    (d) => <option key={d}>{d}</option>
                  )}
                </select>
              </label>

              <label>
                Trạng thái
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Đang làm việc</option>
                  <option>Thử việc</option>
                  <option>Đã nghỉ việc</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
              <button className="primary-btn" type="submit">
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}


import { useState } from "react";
import { Plus, Pencil, Trash2, FolderKanban } from "lucide-react";

export default function ManagerProjects({ projects, setProjects }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    name: "",
    description: "",
    manager: "",
    members: [],
    progress: 0,
    status: "Chưa bắt đầu",
    deadline: "",
  };

  const [form, setForm] = useState(emptyForm);

  const openForm = (project = null) => {
    setEditing(project);
    setForm(
      project
        ? { ...project, deadline: project.deadline }
        : emptyForm
    );
    setShowForm(true);
  };

  const saveProject = (e) => {
    e.preventDefault();

    if (editing) {
      setProjects((prev) =>
        prev.map((p) => p.id === editing.id ? { ...form, id: editing.id } : p)
      );
    } else {
      setProjects((prev) => [
        ...prev,
        { ...form, id: `DA${Date.now().toString().slice(-5)}` },
      ]);
    }

    setShowForm(false);
    setForm(emptyForm);
  };

  const removeProject = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa dự án?")) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <section className="manager-panel">
      <div className="panel-heading">
        <div>
          <h2>Quản lý dự án</h2>
          <p>Theo dõi, phân công và quản lý tiến độ dự án</p>
        </div>

        <button className="primary-btn" onClick={() => openForm()}>
          <Plus size={18} /> Tạo dự án
        </button>
      </div>

      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div className="project-card-top">
              <div className="project-icon">
                <FolderKanban size={23} />
              </div>

              <span className={`status-badge ${
                project.status === "Hoàn thành" ? "approved" : "pending"
              }`}>
                {project.status}
              </span>
            </div>

            <small className="project-code">{project.id}</small>
            <h3>{project.name}</h3>
            <p>{project.description}</p>

            <div className="project-info">
              <span>Người phụ trách</span>
              <strong>{project.manager}</strong>
            </div>

            <div className="project-info">
              <span>Thành viên</span>
              <strong>{project.members.length} người</strong>
            </div>

            <div className="project-progress">
              <div className="progress-heading">
                <span>Tiến độ</span>
                <strong>{project.progress}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="project-info">
              <span>Hạn hoàn thành</span>
              <strong>{project.deadline}</strong>
            </div>

            <div className="project-actions">
              <button onClick={() => openForm(project)}>
                <Pencil size={16} /> Chỉnh sửa
              </button>
              <button
                className="delete-action"
                onClick={() => removeProject(project.id)}
              >
                <Trash2 size={16} /> Xóa
              </button>
            </div>
          </article>
        ))}
      </div>

      {showForm && (
        <div className="manager-modal-overlay">
          <form className="manager-modal" onSubmit={saveProject}>
            <h2>{editing ? "Cập nhật dự án" : "Tạo dự án mới"}</h2>

            <label>
              Tên dự án
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              Mô tả
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>

            <label>
              Người phụ trách
              <select
                required
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
              >
                <option value="">Chọn người phụ trách</option>
                {["Nguyễn Văn An", "Trần Thị Mai", "Lê Hoàng Nam", "Phạm Thu Hà"].map(
                  (name) => <option key={name}>{name}</option>
                )}
              </select>
            </label>

            <label>
              Nhân viên tham gia
              <select
                multiple
                value={form.members}
                onChange={(e) =>
                  setForm({
                    ...form,
                    members: Array.from(e.target.selectedOptions, (o) => o.value),
                  })
                }
              >
                {["Nguyễn Văn An", "Trần Thị Mai", "Lê Hoàng Nam", "Phạm Thu Hà"].map(
                  (name) => <option key={name}>{name}</option>
                )}
              </select>
            </label>

            <label>
              Hạn hoàn thành
              <input
                type="date"
                required
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>

            <label>
              Tiến độ ({form.progress}%)
              <input
                type="range"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) =>
                  setForm({ ...form, progress: Number(e.target.value) })
                }
              />
            </label>

            <label>
              Trạng thái
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Chưa bắt đầu</option>
                <option>Đang thực hiện</option>
                <option>Hoàn thành</option>
                <option>Tạm dừng</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
              <button type="submit" className="primary-btn">
                Lưu dự án
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

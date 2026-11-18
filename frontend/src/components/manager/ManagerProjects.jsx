import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  CalendarDays,
  RefreshCw,
  FolderKanban,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const initialForm = {
  name: "",
  description: "",
  leader: "",
  members: [],
  startDate: "",
  endDate: "",
  progress: 0,
  status: "planning",
};

const statusLabels = {
  planning: "Đang lên kế hoạch",
  active: "Đang thực hiện",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
};

const formatDate = (value) => {
  if (!value) return "Chưa đặt";

  const date = String(value).slice(0, 10);
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
};

export default function ManagerProjects() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Không thể thực hiện yêu cầu.");
    }

    return data;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [projectData, employeeData] = await Promise.all([
        apiRequest("/projects/manager"),
        apiRequest("/employees"),
      ]);

      setProjects(Array.isArray(projectData.projects) ? projectData.projects : []);
      setEmployees(
        (Array.isArray(employeeData.employees) ? employeeData.employees : [])
          .filter((employee) => employee.isActive !== false && employee.status !== "resigned")
      );
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu dự án.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const search = `${project.name} ${project.description} ${project.leader}`.toLowerCase();
      const matchesKeyword = search.includes(keyword.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [projects, keyword, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setMessage("");
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditingId(project._id);

    setForm({
      name: project.name || "",
      description: project.description || "",
      leader: project.leader || "",
      members: (project.members || []).map((member) =>
        String(typeof member === "object" ? member._id : member)
      ),
      startDate: project.startDate ? String(project.startDate).slice(0, 10) : "",
      endDate: project.endDate ? String(project.endDate).slice(0, 10) : "",
      progress: project.progress ?? 0,
      status: project.status || "planning",
    });

    setError("");
    setMessage("");
    setShowModal(true);
  };

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggleMember = (id) => {
    setForm((previous) => ({
      ...previous,
      members: previous.members.includes(id)
        ? previous.members.filter((item) => item !== id)
        : [...previous.members, id],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        progress: Number(form.progress),
      };

      const data = editingId
        ? await apiRequest(`/projects/manager/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/projects/manager", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setMessage(data.message || "Lưu dự án thành công.");
      setShowModal(false);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      setError(err.message || "Không thể lưu dự án.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa dự án "${project.name}" không?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const data = await apiRequest(`/projects/manager/${project._id}`, {
        method: "DELETE",
      });

      setMessage(data.message || "Đã xóa dự án.");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể xóa dự án.");
    }
  };

  return (
    <section className="manager-project-page">
      <style>{`
        .manager-project-page{width:100%;color:#263047}
        .mp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .mp-search{height:42px;min-width:230px;flex:1;max-width:380px;display:flex;align-items:center;gap:9px;padding:0 13px;border:1px solid #e7eaf1;border-radius:9px;background:#fff;color:#9298aa}
        .mp-search input{border:0;outline:0;width:100%;background:transparent;font-size:12px}
        .mp-select{height:42px;padding:0 12px;border:1px solid #e7eaf1;border-radius:9px;background:#fff;color:#555b70;font-size:12px}
        .mp-primary{height:42px;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:9px;background:#3986e8;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
        .mp-primary:disabled{opacity:.6;cursor:not-allowed}
        .mp-alert{padding:12px 15px;border-radius:9px;margin-bottom:15px;font-size:12px}
        .mp-error{background:#fff1f2;color:#dc2626}
        .mp-success{background:#ecfdf5;color:#16845b}
        .mp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .mp-card{background:#fff;border:1px solid #edf0f5;border-radius:13px;padding:19px;min-width:0}
        .mp-card-head{display:flex;justify-content:space-between;gap:12px}
        .mp-card h3{margin:0;color:#263047;font-size:15px}
        .mp-card p{margin:8px 0 0;color:#8791a5;font-size:11px;line-height:1.7;min-height:38px}
        .mp-status{display:inline-flex;padding:6px 9px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap}
        .mp-status.planning{background:#fff4e5;color:#c9872e}
        .mp-status.active{background:#eaf2ff;color:#3986e8}
        .mp-status.completed{background:#e8f8f0;color:#219e69}
        .mp-status.paused{background:#f1f2f6;color:#858a9d}
        .mp-progress-info{display:flex;justify-content:space-between;margin:18px 0 8px;font-size:11px;color:#8791a5}
        .mp-progress{height:7px;border-radius:20px;background:#edf0f6;overflow:hidden}
        .mp-progress-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,#3986e8,#70b0f6)}
        .mp-meta{display:flex;gap:15px;flex-wrap:wrap;margin-top:16px;color:#7c879b;font-size:10px}
        .mp-meta span{display:flex;align-items:center;gap:5px}
        .mp-members{margin-top:14px;padding-top:13px;border-top:1px solid #f0f2f6;font-size:11px;color:#64748b}
        .mp-actions{display:flex;gap:8px;margin-top:16px}
        .mp-icon-btn{height:34px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;border:1px solid #e8edf5;border-radius:8px;background:#fff;color:#64748b;font-size:11px;cursor:pointer}
        .mp-icon-btn.delete{color:#dc6470}
        .mp-empty{padding:45px 15px;text-align:center;color:#9298aa;background:#fff;border:1px solid #edf0f5;border-radius:13px}
        .mp-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:15px;background:rgba(15,23,42,.5)}
        .mp-modal{width:100%;max-width:650px;max-height:90vh;overflow:auto;background:#fff;border-radius:15px;padding:23px}
        .mp-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
        .mp-modal-head h2{margin:0;font-size:18px}
        .mp-close{border:0;background:#f1f3f7;width:34px;height:34px;border-radius:8px;cursor:pointer}
        .mp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .mp-field{display:grid;gap:7px;margin-bottom:14px}
        .mp-field.full{grid-column:1/-1}
        .mp-field label{font-size:11px;font-weight:600;color:#64748b}
        .mp-field input,.mp-field textarea,.mp-field select{width:100%;min-height:40px;padding:10px 11px;border:1px solid #e5e9f0;border-radius:8px;outline:none;font:inherit;font-size:12px;background:#fff}
        .mp-field textarea{min-height:85px;resize:vertical}
        .mp-members-list{max-height:170px;overflow:auto;border:1px solid #e8edf5;border-radius:8px;padding:9px}
        .mp-member-option{display:flex;align-items:center;gap:9px;padding:8px;font-size:11px;color:#475569}
        .mp-member-option small{display:block;color:#9298aa;margin-top:3px}
        .mp-modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
        .mp-cancel{height:40px;padding:0 15px;border:1px solid #e5e9f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer}
        @media(max-width:760px){.mp-grid{grid-template-columns:1fr}.mp-form-grid{grid-template-columns:1fr}.mp-field.full{grid-column:auto}.mp-modal{padding:16px}}
      `}</style>

      {error && <div className="mp-alert mp-error">{error}</div>}
      {message && <div className="mp-alert mp-success">{message}</div>}

      <div className="mp-toolbar">
        <label className="mp-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm dự án..."
          />
        </label>

        <select
          className="mp-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="planning">Đang lên kế hoạch</option>
          <option value="active">Đang thực hiện</option>
          <option value="completed">Hoàn thành</option>
          <option value="paused">Tạm dừng</option>
        </select>

        <button className="mp-primary" type="button" onClick={openCreate}>
          <Plus size={16} />
          Tạo dự án
        </button>

        <button className="mp-icon-btn" type="button" onClick={loadData}>
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="mp-empty">Đang tải danh sách dự án...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="mp-empty">
          <FolderKanban size={30} />
          <p>Chưa có dự án phù hợp.</p>
        </div>
      ) : (
        <div className="mp-grid">
          {filteredProjects.map((project) => (
            <article className="mp-card" key={project._id}>
              <div className="mp-card-head">
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description || "Chưa có mô tả dự án."}</p>
                </div>

                <span className={`mp-status ${project.status}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>

              <div className="mp-progress-info">
                <span>Tiến độ dự án</span>
                <strong>{project.progress || 0}%</strong>
              </div>

              <div className="mp-progress">
                <div
                  className="mp-progress-fill"
                  style={{ width: `${project.progress || 0}%` }}
                />
              </div>

              <div className="mp-meta">
                <span><Users size={13} /> {(project.members || []).length} nhân viên</span>
                <span><CalendarDays size={13} /> {formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
              </div>

              <div className="mp-members">
                **Trưởng dự án:** {project.leader || "Chưa phân công"}
                <br />
                **Thành viên:** {(project.members || []).map((member) => member.name).filter(Boolean).join(", ") || "Chưa có"}
              </div>

              <div className="mp-actions">
                <button
                  className="mp-icon-btn"
                  type="button"
                  onClick={() => openEdit(project)}
                >
                  <Pencil size={14} />
                  Chỉnh sửa
                </button>

                <button
                  className="mp-icon-btn delete"
                  type="button"
                  onClick={() => handleDelete(project)}
                >
                  <Trash2 size={14} />
                  Xóa dự án
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="mp-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowModal(false);
          }}
        >
          <form className="mp-modal" onSubmit={handleSubmit}>
            <div className="mp-modal-head">
              <h2>{editingId ? "Cập nhật dự án" : "Tạo dự án mới"}</h2>
              <button
                className="mp-close"
                type="button"
                onClick={() => setShowModal(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="mp-form-grid">
              <div className="mp-field full">
                <label>Tên dự án *</label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Nhập tên dự án"
                />
              </div>

              <div className="mp-field full">
                <label>Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Mô tả mục tiêu và nội dung dự án..."
                />
              </div>

              <div className="mp-field">
                <label>Trưởng dự án</label>
                <input
                  value={form.leader}
                  onChange={(event) => updateField("leader", event.target.value)}
                  placeholder="Tên trưởng dự án"
                />
              </div>

              <div className="mp-field">
                <label>Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  <option value="planning">Đang lên kế hoạch</option>
                  <option value="active">Đang thực hiện</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="paused">Tạm dừng</option>
                </select>
              </div>

              <div className="mp-field">
                <label>Ngày bắt đầu</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateField("startDate", event.target.value)}
                />
              </div>

              <div className="mp-field">
                <label>Ngày kết thúc</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => updateField("endDate", event.target.value)}
                />
              </div>

              <div className="mp-field full">
                <label>Tiến độ: {form.progress}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(event) => updateField("progress", event.target.value)}
                />
              </div>

              <div className="mp-field full">
                <label>Thêm nhân viên vào dự án</label>

                <div className="mp-members-list">
                  {employees.length === 0 ? (
                    <p>Chưa có nhân viên khả dụng.</p>
                  ) : (
                    employees.map((employee) => {
                      const id = String(employee._id || employee.id);

                      return (
                        <label className="mp-member-option" key={id}>
                          <input
                            type="checkbox"
                            checked={form.members.includes(id)}
                            onChange={() => toggleMember(id)}
                          />
                          <span>
                            {employee.name}
                            <small>
                              {employee.employeeCode || "Chưa có mã"} · {employee.department || "Chưa có phòng ban"}
                            </small>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <small>
                  Nhân viên mới được thêm sẽ tự động nhận thông báo trong tài khoản.
                </small>
              </div>
            </div>

            <div className="mp-modal-actions">
              <button
                className="mp-cancel"
                type="button"
                onClick={() => setShowModal(false)}
              >
                Hủy
              </button>

              <button className="mp-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo dự án"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
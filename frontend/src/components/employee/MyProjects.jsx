import { useCallback, useEffect, useState } from "react";
import {
  FolderKanban,
  CalendarDays,
  Users,
  RefreshCw,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatDate = (value) => {
  if (!value) return "Chưa đặt";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  return `${day}/${month}/${year}`;
};

const statusLabels = {
  planning: "Đang lên kế hoạch",
  active: "Đang thực hiện",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
};

export default function MyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(`${API_URL}/projects/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tải dự án.");
      }

      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (err) {
      setError(err.message || "Không thể tải dự án.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="employee-page">
      <style>{`
        .my-projects-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .my-project-card{background:#fff;border:1px solid #edf0f5;border-radius:14px;padding:20px}
        .my-project-head{display:flex;justify-content:space-between;gap:10px}
        .my-project-card h3{font-size:15px;color:#263047;margin:0}
        .my-project-card p{font-size:11px;color:#8791a5;line-height:1.7;margin:9px 0 0}
        .my-project-status{padding:6px 9px;border-radius:20px;font-size:10px;white-space:nowrap;height:max-content}
        .my-project-status.planning{background:#fff4e5;color:#c9872e}
        .my-project-status.active{background:#eaf2ff;color:#3986e8}
        .my-project-status.completed{background:#e8f8f0;color:#219e69}
        .my-project-status.paused{background:#f1f2f6;color:#858a9d}
        .my-project-progress-info{display:flex;justify-content:space-between;margin:18px 0 8px;font-size:11px;color:#8791a5}
        .my-project-progress{height:7px;background:#edf0f6;border-radius:20px;overflow:hidden}
        .my-project-progress-fill{height:100%;background:linear-gradient(90deg,#3986e8,#70b0f6);border-radius:20px}
        .my-project-meta{display:flex;gap:15px;flex-wrap:wrap;margin-top:16px;font-size:10px;color:#7c879b}
        .my-project-meta span{display:flex;align-items:center;gap:5px}
        .my-project-empty{padding:45px 15px;text-align:center;background:#fff;border:1px solid #edf0f5;border-radius:13px;color:#9298aa}
        .my-project-error{padding:12px 15px;margin-bottom:15px;background:#fff1f2;color:#dc2626;border-radius:9px;font-size:12px}
        .my-project-refresh{display:flex;align-items:center;gap:7px;padding:9px 13px;border:1px solid #e5eaf2;border-radius:8px;background:#fff;color:#64748b;font-size:11px;cursor:pointer}
        @media(max-width:700px){.my-projects-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="employee-section-title" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <h1>Dự án của tôi</h1>
          <p>Theo dõi các dự án mà quản lý đã phân công cho bạn.</p>
        </div>

        <button
          type="button"
          className="my-project-refresh"
          onClick={loadProjects}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && <div className="my-project-error">{error}</div>}

      {loading ? (
        <div className="my-project-empty">Đang tải danh sách dự án...</div>
      ) : projects.length === 0 ? (
        <div className="my-project-empty">
          <FolderKanban size={32} />
          <p>Bạn chưa được phân công vào dự án nào.</p>
        </div>
      ) : (
        <div className="my-projects-grid">
          {projects.map((project) => (
            <article className="my-project-card" key={project._id}>
              <div className="my-project-head">
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description || "Chưa có mô tả dự án."}</p>
                </div>

                <span className={`my-project-status ${project.status}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>

              <div className="my-project-progress-info">
                <span>Tiến độ dự án</span>
                <strong>{project.progress || 0}%</strong>
              </div>

              <div className="my-project-progress">
                <div
                  className="my-project-progress-fill"
                  style={{ width: `${project.progress || 0}%` }}
                />
              </div>

              <div className="my-project-meta">
                <span>
                  <CalendarDays size={13} />
                  {formatDate(project.startDate)} – {formatDate(project.endDate)}
                </span>

                <span>
                  <Users size={13} />
                  {(project.members || []).length} thành viên
                </span>
              </div>

              <div className="project-leader">
                Trưởng dự án: <strong>{project.leader || "Chưa phân công"}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
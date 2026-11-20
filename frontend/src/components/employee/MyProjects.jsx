
import MyProjectTasks from "./MyProjectTasks";
import { useCallback, useEffect, useState } from "react";
import {
  FolderKanban,
  CalendarDays,
  Users,
  RefreshCw,
  Eye,
} from "lucide-react";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatDate = (value) => {
  if (!value) return "Chưa đặt";

  const [year, month, day] = String(value)
    .slice(0, 10)
    .split("-");

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
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  // ========================================
  // TẢI DANH SÁCH DỰ ÁN
  // ========================================

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(`${API_URL}/projects/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải dự án."
        );
      }

      setProjects(
        Array.isArray(data.projects) ? data.projects : []
      );
    } catch (err) {
      setError(err.message || "Không thể tải dự án.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <div className="employee-page">

      <style>{`
        /* GRID DỰ ÁN */
        .my-projects-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }

        /* THẺ DỰ ÁN */
        .my-project-card {
          min-width: 0;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 14px;
          padding: 20px;
        }

        .my-project-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }

        .my-project-card h3 {
          font-size: 15px;
          color: #263047;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .my-project-card p {
          font-size: 11px;
          color: #8791a5;
          line-height: 1.7;
          margin: 9px 0 0;
          overflow-wrap: anywhere;
        }

        /* TRẠNG THÁI */
        .my-project-status {
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 10px;
          white-space: nowrap;
          height: max-content;
          flex-shrink: 0;
        }

        .my-project-status.planning {
          background: #fff4e5;
          color: #c9872e;
        }

        .my-project-status.active {
          background: #eaf2ff;
          color: #3986e8;
        }

        .my-project-status.completed {
          background: #e8f8f0;
          color: #219e69;
        }

        .my-project-status.paused {
          background: #f1f2f6;
          color: #858a9d;
        }

        /* TIẾN ĐỘ */
        .my-project-progress-info {
          display: flex;
          justify-content: space-between;
          margin: 18px 0 8px;
          font-size: 11px;
          color: #8791a5;
        }

        .my-project-progress {
          height: 7px;
          background: #edf0f6;
          border-radius: 20px;
          overflow: hidden;
        }

        .my-project-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3986e8, #70b0f6);
          border-radius: 20px;
          transition: width 0.3s ease;
        }

        /* THÔNG TIN DỰ ÁN */
        .my-project-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 16px;
          font-size: 10px;
          color: #7c879b;
        }

        .my-project-meta span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .project-leader {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #edf0f5;
          font-size: 11px;
          color: #8791a5;
        }

        .project-leader strong {
          color: #263047;
        }

        /* TRẠNG THÁI TRỐNG */
        .my-project-empty {
          padding: 45px 15px;
          text-align: center;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 13px;
          color: #9298aa;
        }

        .my-project-empty svg {
          margin-bottom: 8px;
        }

        .my-project-empty p {
          margin: 0;
          font-size: 12px;
        }

        /* LỖI */
        .my-project-error {
          padding: 12px 15px;
          margin-bottom: 15px;
          background: #fff1f2;
          color: #dc2626;
          border-radius: 9px;
          font-size: 12px;
        }

        /* NÚT LÀM MỚI - DESKTOP GIỮ NGUYÊN */
        .my-project-refresh {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: auto;
          min-width: 0;
          min-height: 42px;
          padding: 9px 13px;
          border: 1px solid #e5eaf2;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          flex: 0 0 auto;
          white-space: nowrap;
          transition: 0.2s;
        }

        .my-project-refresh:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #93c5fd;
          color: #3986e8;
        }

        .my-project-refresh:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .my-project-refresh svg {
          flex-shrink: 0;
        }

        /* TABLET */
        @media (max-width: 900px) {
          .my-projects-grid {
            grid-template-columns: 1fr;
          }
        }

        /* MOBILE */
        @media (max-width: 600px) {
          .my-projects-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .my-project-card {
            padding: 16px;
          }

          .my-project-head {
            gap: 8px;
          }

          /* CHỈ THU NHỎ NÚT TRÊN MOBILE */
          .my-project-refresh {
            width: auto !important;
            min-width: 0 !important;
            min-height: 34px !important;
            height: 34px !important;
            padding: 0 10px !important;
            font-size: 11px !important;
            gap: 5px !important;
            border-radius: 7px !important;
          }

          .my-project-refresh svg {
            width: 13px;
            height: 13px;
          }
        }

        /* MOBILE NHỎ */
        @media (max-width: 380px) {
          .my-project-card {
            padding: 13px;
          }

          .my-project-refresh {
            height: 32px !important;
            min-height: 32px !important;
            padding: 0 8px !important;
            font-size: 10px !important;
          }

          .my-project-meta {
            gap: 9px;
          }
        }
          .my-project-detail-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          min-height: 39px;
          margin-top: 15px;
          padding: 8px 12px;
          border: 1px solid #dbe5f2;
          border-radius: 8px;
          background: #f8fafc;
          color: #3986e8;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .my-project-detail-btn:hover {
          background: #eaf2ff;
          border-color: #93c5fd;
        }
      `}</style>

      {/* TIÊU ĐỀ */}
      <div
        className="employee-section-title"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1>Dự án của tôi</h1>
          <p>
            Theo dõi các dự án mà quản lý đã phân công cho bạn.
          </p>
        </div>

        {/* NÚT LÀM MỚI */}
        <button
          type="button"
          className="my-project-refresh"
          onClick={loadProjects}
          disabled={loading}
        >
          <RefreshCw
            size={14}
            className={loading ? "attendance-spinner" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* THÔNG BÁO LỖI */}
      {error && (
        <div className="my-project-error">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div className="my-project-empty">
          Đang tải danh sách dự án...
        </div>
      ) : projects.length === 0 ? (
        /* CHƯA CÓ DỰ ÁN */
        <div className="my-project-empty">
          <FolderKanban size={32} />
          <p>
            Bạn chưa được phân công vào dự án nào.
          </p>
        </div>
      ) : (
        /* DANH SÁCH DỰ ÁN */
        <div className="my-projects-grid">
          {projects.map((project) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(project.progress) || 0)
            );

            return (
              <article
                className="my-project-card"
                key={project._id}
              >
                <div className="my-project-head">
                  <div style={{ minWidth: 0 }}>
                    <h3>
                      {project.name || "Dự án chưa có tên"}
                    </h3>

                    <p>
                      {project.description ||
                        "Chưa có mô tả dự án."}
                    </p>
                  </div>

                  <span
                    className={`my-project-status ${
                      project.status || "planning"
                    }`}
                  >
                    {statusLabels[project.status] ||
                      project.status ||
                      "Chưa xác định"}
                  </span>
                </div>

                {/* TIẾN ĐỘ */}
                <div className="my-project-progress-info">
                  <span>Tiến độ dự án</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="my-project-progress">
                  <div
                    className="my-project-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                {/* THÔNG TIN */}
                <div className="my-project-meta">
                  <span>
                    <CalendarDays size={13} />
                    {formatDate(project.startDate)} –{" "}
                    {formatDate(project.endDate)}
                  </span>

                  <span>
                    <Users size={13} />
                    {(Array.isArray(project.members)
                      ? project.members
                      : []
                    ).length}{" "}
                    thành viên
                  </span>
                </div>

                <div className="project-leader">
                  Trưởng dự án:{" "}
                  <strong>
                    {project.leader || "Chưa phân công"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="my-project-detail-btn"
                  onClick={() => setSelectedProjectId(project._id)}
                >
                  <Eye size={14} />
                  Xem nhiệm vụ của tôi
                </button>
              </article>
            );
          })}
        </div>
      )}{selectedProjectId && (
  <div
    className="mpt-overlay"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
      background: "rgba(15, 23, 42, 0.58)",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 950,
        maxHeight: "94vh",
        overflowY: "auto",
        padding: 20,
        borderRadius: 14,
        background: "#f8fafc",
      }}
    >
      <MyProjectTasks
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
      />
    </div>
  </div>
)}
    </div>
  );
}

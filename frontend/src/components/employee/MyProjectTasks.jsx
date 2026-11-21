
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Save,
  ClipboardList,
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

  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const statusLabels = {
  todo: "Chưa bắt đầu",
  doing: "Đang thực hiện",
  done: "Hoàn thành",
};

const getFileUrl = (file) => {
  if (!file?.path) return "#";

  if (/^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  return `${RAW_API_URL.replace(/\/+$/, "")}${file.path}`;
};

export default function MyProjectTasks({ projectId, onClose }) {
  const pageRef = useRef(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Dữ liệu chỉnh sửa riêng cho từng nhiệm vụ
useEffect(() => {
  const handleOutsideClick = (event) => {
    if (
      pageRef.current &&
      !pageRef.current.contains(event.target)
    ) {
      onClose?.();
    }
  };

  document.addEventListener("mousedown", handleOutsideClick);

  return () => {
    document.removeEventListener("mousedown", handleOutsideClick);
  };
}, [onClose]);

  const [taskEdits, setTaskEdits] = useState({});

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Không thể thực hiện yêu cầu.");
    }

    return data;
  }, []);

  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(`/projects/me/${projectId}`);

      const currentProject = data.project || null;
      setProject(currentProject);

      // Chỉ khởi tạo dữ liệu chỉnh sửa cho nhiệm vụ được API trả về
      const edits = {};

      (currentProject?.tasks || []).forEach((task) => {
        edits[task._id] = {
          progress: Number(task.progress) || 0,
          employeeNote: task.employeeNote || "",
        };
      });

      setTaskEdits(edits);
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết dự án.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];

  const updateTaskField = (taskId, key, value) => {
    setTaskEdits((previous) => ({
      ...previous,
      [taskId]: {
        ...(previous[taskId] || {}),
        [key]: value,
      },
    }));
  };

  const saveProgress = async (taskId) => {
    const edit = taskEdits[taskId];

    if (!edit) return;

    const progress = Math.min(
      100,
      Math.max(0, Number(edit.progress) || 0)
    );

    try {
      setSavingId(taskId);
      setError("");
      setMessage("");

      const data = await apiRequest(
        `/projects/me/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            progress,
            employeeNote: edit.employeeNote || "",
          }),
        }
      );

      setMessage(data.message || "Đã cập nhật tiến độ nhiệm vụ.");

      await loadProject();
    } catch (err) {
      setError(err.message || "Không thể cập nhật tiến độ.");
    } finally {
      setSavingId("");
    }
  };

  const completedCount = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const doingCount = tasks.filter(
    (task) => task.status === "doing"
  ).length;

  return (
   <section className="mpt-page" ref={pageRef}>
      <style>{`
        .mpt-page {
          width: 100%;
          color: #263047;
        }
        .mpt-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .mpt-back, .mpt-refresh, .mpt-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 39px;
          padding: 0 13px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .mpt-back, .mpt-refresh {
          background: white;
          border: 1px solid #e5eaf1;
          color: #64748b;
        }
        .mpt-save {
          background: #26364f;
          border: 1px solid #26364f;
          color: white;
        }
        .mpt-save:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .mpt-project-card, .mpt-task-card {
          background: white;
          border: 1px solid #edf0f5;
          border-radius: 13px;
          padding: 18px;
          min-width: 0;
        }
        .mpt-project-card {
          margin-bottom: 16px;
        }
        .mpt-project-card h2 {
          margin: 0;
          font-size: 19px;
          overflow-wrap: anywhere;
        }
        .mpt-description {
          color: #8791a5;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .mpt-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          color: #7c879b;
          font-size: 11px;
          margin-top: 12px;
        }
        .mpt-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .mpt-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .mpt-stat {
          padding: 15px;
          background: white;
          border: 1px solid #edf0f5;
          border-radius: 11px;
        }
        .mpt-stat span {
          display: block;
          color: #8791a5;
          font-size: 11px;
        }
        .mpt-stat strong {
          display: block;
          margin-top: 7px;
          font-size: 21px;
        }
        .mpt-task-list {
          display: grid;
          gap: 13px;
        }
        .mpt-task-card h3 {
          margin: 0;
          font-size: 14px;
          overflow-wrap: anywhere;
        }
        .mpt-task-card p {
          color: #7c879b;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .mpt-task-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .mpt-status {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 20px;
          background: #f1f3f7;
          color: #64748b;
          font-size: 10px;
        }
        .mpt-status.doing {
          background: #eaf2ff;
          color: #3986e8;
        }
        .mpt-status.done {
          background: #e8f8f0;
          color: #219e69;
        }
        .mpt-progress-info {
          display: flex;
          justify-content: space-between;
          margin: 17px 0 8px;
          font-size: 11px;
          color: #8791a5;
        }
        .mpt-range {
          width: 100%;
          accent-color: #3986e8;
          cursor: pointer;
        }
        .mpt-note {
          width: 100%;
          box-sizing: border-box;
          min-height: 85px;
          padding: 11px;
          border: 1px solid #e5eaf1;
          border-radius: 8px;
          resize: vertical;
          outline: none;
          font: inherit;
          font-size: 12px;
        }
        .mpt-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0;
        }
        .mpt-files a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 9px;
          border: 1px solid #e5eaf1;
          border-radius: 7px;
          color: #475569;
          font-size: 11px;
          text-decoration: none;
          overflow-wrap: anywhere;
        }
        .mpt-field-label {
          display: block;
          margin: 14px 0 7px;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }
        .mpt-alert {
          padding: 11px 13px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 12px;
        }
        .mpt-error {
          color: #dc2626;
          background: #fff1f2;
        }
        .mpt-success {
          color: #16845b;
          background: #ecfdf5;
        }
        .mpt-empty {
          padding: 35px 15px;
          text-align: center;
          border: 1px dashed #dce3ed;
          border-radius: 12px;
          color: #8791a5;
          background: white;
          font-size: 12px;
        }
        @media (max-width: 600px) {
          .mpt-stats {
            grid-template-columns: 1fr;
          }
          .mpt-project-card, .mpt-task-card {
            padding: 14px;
          }
          .mpt-toolbar {
            align-items: stretch;
          }
        }
      `}</style>

      <div className="mpt-toolbar">
        <button className="mpt-back" type="button" onClick={onClose}>
          <ArrowLeft size={15} />
          Quay lại
        </button>

        <button
          className="mpt-refresh"
          type="button"
          onClick={loadProject}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && <div className="mpt-alert mpt-error">{error}</div>}
      {message && <div className="mpt-alert mpt-success">{message}</div>}

      {loading ? (
        <div className="mpt-empty">Đang tải nhiệm vụ...</div>
      ) : !project ? (
        <div className="mpt-empty">Không tìm thấy dự án.</div>
      ) : (
        <>
          <div className="mpt-project-card">
            <h2>{project.name}</h2>

            <div className="mpt-description">
              {project.description || "Chưa có mô tả dự án."}
            </div>

            <div className="mpt-meta">
              <span>
                <CalendarDays size={13} />
                {formatDate(project.startDate)} – {formatDate(project.endDate)}
              </span>
              <span>
                <UserRound size={13} />
                {Array.isArray(project.members) ? project.members.length : 0} thành viên
              </span>
            </div>
          </div>

          <div className="mpt-stats">
            <div className="mpt-stat">
              <span>Nhiệm vụ của tôi</span>
              <strong>{tasks.length}</strong>
            </div>
            <div className="mpt-stat">
              <span>Đang thực hiện</span>
              <strong>{doingCount}</strong>
            </div>
            <div className="mpt-stat">
              <span>Đã hoàn thành</span>
              <strong>{completedCount}</strong>
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: "20px 0 12px" }}>
            Nhiệm vụ được giao
          </h3>

          {tasks.length === 0 ? (
            <div className="mpt-empty">
              Hiện tại bạn chưa có nhiệm vụ nào trong dự án này.
            </div>
          ) : (
            <div className="mpt-task-list">
              {tasks.map((task) => {
                const edit = taskEdits[task._id] || {
                  progress: Number(task.progress) || 0,
                  employeeNote: task.employeeNote || "",
                };

                const progress = Math.min(
                  100,
                  Math.max(0, Number(edit.progress) || 0)
                );

                return (
                  <article className="mpt-task-card" key={task._id}>
                    <div className="mpt-task-head">
                      <div style={{ minWidth: 0 }}>
                        <h3>{task.title}</h3>
                        <div className="mpt-meta">
                          <span>
                            <CalendarDays size={13} />
                            {formatDate(task.startDate)} – {formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>

                      <span className={`mpt-status ${task.status || "todo"}`}>
                        {statusLabels[task.status] || "Chưa bắt đầu"}
                      </span>
                    </div>

                    <p>{task.description || "Không có mô tả chi tiết."}</p>

                    {Array.isArray(task.attachments) &&
                      task.attachments.length > 0 && (
                        <div className="mpt-files">
                          {task.attachments.map((file, index) => (
                            <a
                              key={`${file.filename || file.path}-${index}`}
                              href={getFileUrl(file)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {String(file.mimeType || "").startsWith("image/") ? (
                                <ImageIcon size={14} />
                              ) : (
                                <FileText size={14} />
                              )}
                              {file.originalName || "Tệp đính kèm"}
                            </a>
                          ))}
                        </div>
                      )}

                    <div className="mpt-progress-info">
                      <span>Tiến độ công việc</span>
                      <strong>{progress}%</strong>
                    </div>

                    <input
                      className="mpt-range"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progress}
                      onChange={(event) =>
                        updateTaskField(
                          task._id,
                          "progress",
                          Number(event.target.value)
                        )
                      }
                    />

                    <label className="mpt-field-label">
                      Ghi chú cập nhật công việc
                    </label>

                    <textarea
                      className="mpt-note"
                      value={edit.employeeNote}
                      onChange={(event) =>
                        updateTaskField(
                          task._id,
                          "employeeNote",
                          event.target.value
                        )
                      }
                      placeholder="Ví dụ: Đã hoàn thành giao diện đăng nhập, đang kiểm tra API..."
                    />

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 13 }}>
                      <button
                        className="mpt-save"
                        type="button"
                        onClick={() => saveProgress(task._id)}
                        disabled={savingId === task._id}
                      >
                        <Save size={14} />
                        {savingId === task._id ? "Đang lưu..." : "Lưu tiến độ"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

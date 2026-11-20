
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  RefreshCw,
  Trash2,
  CalendarDays,
  UserRound,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatDate = (value) => {
  if (!value) return "Chưa đặt";

  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return String(value);
};

const taskStatusLabels = {
  todo: "Chưa bắt đầu",
  doing: "Đang thực hiện",
  done: "Hoàn thành",
};

const initialTask = {
  title: "",
  description: "",
  assignee: "",
  startDate: "",
  dueDate: "",
};

export default function ProjectTaskManager({ projectId, onClose }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [form, setForm] = useState(initialTask);
  const [files, setFiles] = useState([]);
  const [taskToDelete, setTaskToDelete] = useState(null);
const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  // ================= API =================

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
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

      const data = await apiRequest(
        `/projects/manager/${projectId}`
      );

      setProject(data.project || null);
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết dự án.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!taskToDelete) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deletingId) {
        setTaskToDelete(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [taskToDelete, deletingId]);

  const members = Array.isArray(project?.members)
    ? project.members
    : [];

  const tasks = Array.isArray(project?.tasks)
    ? project.tasks
    : [];

  // ================= FORM =================

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const openTaskForm = () => {
    setForm({
      ...initialTask,
      assignee: members.length ? getId(members[0]) : "",
    });

    setFiles([]);
    setError("");
    setMessage("");
    setShowTaskForm(true);
  };

  const submitTask = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Vui lòng nhập tên nhiệm vụ.");
      return;
    }

    if (!form.assignee) {
      setError("Vui lòng chọn người được giao nhiệm vụ.");
      return;
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.dueDate < form.startDate
    ) {
      setError("Hạn hoàn thành không được trước ngày bắt đầu.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const formData = new FormData();

      formData.append("title", form.title.trim());
      formData.append("description", form.description);
      formData.append("assignee", form.assignee);
      formData.append("startDate", form.startDate);
      formData.append("dueDate", form.dueDate);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const data = await apiRequest(
        `/projects/manager/${projectId}/tasks`,
        {
          method: "POST",
          body: formData,
        }
      );

      setShowTaskForm(false);
      setForm(initialTask);
      setFiles([]);

      setMessage(data.message || "Giao nhiệm vụ thành công.");

      await loadProject();
    } catch (err) {
      setError(err.message || "Không thể giao nhiệm vụ.");
    } finally {
      setSaving(false);
    }
  };

  // ================= XÓA NHIỆM VỤ =================

  const deleteTask = async () => {
    if (!taskToDelete) return;

    const taskId = taskToDelete._id;

    try {
      setDeletingId(taskId);
      setError("");
      setMessage("");

      const data = await apiRequest(
        `/projects/manager/${projectId}/tasks/${taskId}`,
        {
          method: "DELETE",
        }
      );

      setTaskToDelete(null);
      setMessage(data.message || "Đã xóa nhiệm vụ.");

      await loadProject();
    } catch (err) {
      setError(err.message || "Không thể xóa nhiệm vụ.");
    } finally {
      setDeletingId("");
    }
  };

  // ================= XÓA RIÊNG FILE =================

 
const deleteAttachment = async () => {
  if (!attachmentToDelete) return;

  const { task, file } = attachmentToDelete;

  if (!file?._id) {
    setError("Không xác định được mã tệp đính kèm.");
    setAttachmentToDelete(null);
    return;
  }

  try {
    setDeletingAttachmentId(file._id);
    setError("");
    setMessage("");

    const data = await apiRequest(
      `/projects/manager/${projectId}/tasks/${task._id}/attachments/${file._id}`,
      { method: "DELETE" }
    );

    setAttachmentToDelete(null);
    setMessage(data.message || "Đã xóa tệp đính kèm.");

    await loadProject();
  } catch (err) {
    setError(err.message || "Không thể xóa tệp đính kèm.");
  } finally {
    setDeletingAttachmentId("");
  }
};

  // ================= TIỆN ÍCH =================

  const getMemberName = (memberId) => {
    const member = members.find(
      (item) => getId(item) === getId(memberId)
    );

    return member?.name || member?.fullName || "Thành viên";
  };

  const getFileUrl = (file) => {
    if (!file) return "#";

    const url = file.url || file.path;

    if (!url) return "#";

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return `${RAW_API_URL.replace(/\/+$/, "")}${url}`;
  };

  // ================= GIAO DIỆN =================

  return (
    <section className="ptm-page">
      <style>{`
        .ptm-page {
          width: 100%;
          color: #263047;
        }

        .ptm-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .ptm-back,
        .ptm-primary,
        .ptm-secondary,
        .ptm-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 39px;
          padding: 0 13px;
          border-radius: 9px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s;
        }

        .ptm-back,
        .ptm-secondary {
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
        }

        .ptm-back:hover,
        .ptm-secondary:hover {
          background: #f8fafc;
        }

        .ptm-primary {
          border: 1px solid #202d43;
          background: #202d43;
          color: white;
        }

        .ptm-primary:hover {
          background: #334155;
        }

        .ptm-danger {
          border: 1px solid #dc2626;
          background: #dc2626;
          color: white;
        }

        .ptm-danger:hover {
          background: #b91c1c;
        }

        .ptm-primary:disabled,
        .ptm-danger:disabled,
        .ptm-secondary:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .ptm-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .ptm-summary-card,
        .ptm-task-card {
          background: white;
          border: 1px solid #edf0f5;
          border-radius: 12px;
          padding: 16px;
          min-width: 0;
        }

        .ptm-summary-card span {
          display: block;
          color: #8791a5;
          font-size: 11px;
        }

        .ptm-summary-card strong {
          display: block;
          margin-top: 7px;
          font-size: 20px;
        }

        .ptm-task-list {
          display: grid;
          gap: 12px;
        }

        .ptm-task-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .ptm-task-card h3 {
          margin: 0;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .ptm-task-card p {
          color: #7c879b;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .ptm-status {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 20px;
          background: #eef2f7;
          color: #475569;
          font-size: 10px;
          white-space: nowrap;
        }

        .ptm-status.done {
          background: #e8f8f0;
          color: #219e69;
        }

        .ptm-status.doing {
          background: #eaf2ff;
          color: #3986e8;
        }

        .ptm-progress {
          height: 7px;
          overflow: hidden;
          border-radius: 20px;
          background: #edf0f6;
        }

        .ptm-progress > div {
          height: 100%;
          background: #3986e8;
          transition: width .25s;
        }

        .ptm-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 13px;
          margin: 12px 0;
          color: #7c879b;
          font-size: 11px;
        }

        .ptm-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .ptm-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .ptm-file-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          padding: 4px 6px 4px 0;
          border: 1px solid #e5eaf1;
          border-radius: 8px;
          background: #fff;
        }

        .ptm-file-item a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          padding: 6px 8px;
          color: #475569;
          text-decoration: none;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .ptm-file-item a:hover {
          color: #2563eb;
        }

        .ptm-file-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          border: 0;
          border-radius: 6px;
          background: #fff1f2;
          color: #dc6470;
          cursor: pointer;
        }

        .ptm-file-delete:hover {
          background: #ffe0e3;
        }

        .ptm-file-delete:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .ptm-delete {
          border: 0;
          background: transparent;
          color: #dc6470;
          cursor: pointer;
          padding: 5px;
          border-radius: 7px;
        }

        .ptm-delete:hover {
          background: #fff1f2;
        }

        .ptm-alert {
          padding: 11px 13px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .ptm-error {
          color: #dc2626;
          background: #fff1f2;
        }

        .ptm-success {
          color: #16845b;
          background: #ecfdf5;
        }

        .ptm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          background: rgba(15, 23, 42, .58);
          backdrop-filter: blur(3px);
          animation: ptmFade .18s ease;
        }

        .ptm-modal {
          width: 100%;
          max-width: 600px;
          max-height: 92vh;
          overflow: auto;
          padding: 22px;
          border-radius: 16px;
          background: white;
          box-shadow: 0 24px 70px rgba(15, 23, 42, .22);
          animation: ptmPop .2s ease;
        }

        .ptm-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .ptm-modal-head h2 {
          margin: 0;
          font-size: 17px;
        }

        .ptm-close {
          border: 0;
          border-radius: 8px;
          width: 34px;
          height: 34px;
          cursor: pointer;
          background: #f1f3f7;
        }

        .ptm-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .ptm-field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .ptm-field.full {
          grid-column: 1 / -1;
        }

        .ptm-field label {
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .ptm-field input,
        .ptm-field textarea,
        .ptm-field select {
          width: 100%;
          box-sizing: border-box;
          min-height: 40px;
          padding: 10px;
          border: 1px solid #e5e9f0;
          border-radius: 8px;
          outline: none;
          font: inherit;
          font-size: 12px;
        }

        .ptm-field input:focus,
        .ptm-field textarea:focus,
        .ptm-field select:focus {
          border-color: #7da8e8;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .1);
        }

        .ptm-field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .ptm-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
        }

        .ptm-empty {
          padding: 35px 15px;
          text-align: center;
          border: 1px dashed #dce3ed;
          border-radius: 12px;
          color: #8791a5;
          background: white;
          font-size: 12px;
        }

        .ptm-confirm-modal {
          max-width: 420px;
          padding: 25px;
        }

        .ptm-confirm-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          color: #dc2626;
          background: #fee2e2;
          margin-bottom: 17px;
        }

        .ptm-confirm-title {
          margin: 0 0 9px;
          color: #172033;
          font-size: 18px;
          font-weight: 700;
        }

        .ptm-confirm-text {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .ptm-confirm-task {
          margin-top: 13px;
          padding: 11px 12px;
          border: 1px solid #fee2e2;
          border-radius: 9px;
          background: #fff7f7;
          color: #991b1b;
          font-size: 12px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        @keyframes ptmFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ptmPop {
          from {
            opacity: 0;
            transform: translateY(8px) scale(.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 650px) {
          .ptm-summary {
            grid-template-columns: 1fr;
          }

          .ptm-form-grid {
            grid-template-columns: 1fr;
          }

          .ptm-field.full {
            grid-column: auto;
          }

          .ptm-modal {
            padding: 16px;
          }

          .ptm-confirm-modal {
            padding: 22px;
          }

          .ptm-top {
            align-items: stretch;
          }

          .ptm-top > div {
            width: 100%;
          }

          .ptm-modal-actions {
            flex-wrap: wrap;
          }
        }

.ptm-file-confirm {
  max-width: 430px;
  padding: 26px;
  border: 1px solid #eef0f4;
  border-radius: 18px;
}

.ptm-file-confirm-icon {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 17px;
  border-radius: 16px;
  color: #dc6470;
  background: #fff0f1;
}

.ptm-file-confirm-title {
  margin: 0 0 9px;
  color: #172033;
  font-size: 18px;
  font-weight: 700;
}

.ptm-file-confirm-description {
  margin: 0;
  color: #718096;
  font-size: 13px;
  line-height: 1.7;
}

.ptm-file-confirm-name {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ptm-file-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 22px;
}

.ptm-file-confirm-actions button {
  min-height: 39px;
  padding: 0 15px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ptm-file-cancel {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
}

.ptm-file-cancel:hover {
  background: #f8fafc;
}

.ptm-file-confirm-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dc2626;
  background: #dc2626;
  color: #fff;
}

.ptm-file-confirm-delete:hover {
  background: #b91c1c;
}

.ptm-file-confirm-actions button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .ptm-file-confirm {
    padding: 20px;
  }

  .ptm-file-confirm-actions {
    flex-direction: column-reverse;
  }

  .ptm-file-confirm-actions button {
    width: 100%;
  }
}

      `}</style>

      <div className="ptm-top">
        <button
          className="ptm-back"
          onClick={onClose}
          type="button"
        >
          <ArrowLeft size={15} />
          Quay lại dự án
        </button>

        <button
          className="ptm-primary"
          type="button"
          onClick={openTaskForm}
          disabled={loading || !project}
        >
          <Plus size={15} />
          Giao nhiệm vụ
        </button>
      </div>

      {error && (
        <div className="ptm-alert ptm-error">
          {error}
        </div>
      )}

      {message && (
        <div className="ptm-alert ptm-success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="ptm-empty">
          Đang tải chi tiết dự án...
        </div>
      ) : !project ? (
        <div className="ptm-empty">
          Không tìm thấy dự án.
        </div>
      ) : (
        <>
          <div
            className="ptm-task-card"
            style={{ marginBottom: 16 }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>
              {project.name}
            </h2>

            <p>
              {project.description || "Chưa có mô tả dự án."}
            </p>

            <div className="ptm-meta">
              <span>
                <CalendarDays size={13} />
                {formatDate(project.startDate)} – {formatDate(project.endDate)}
              </span>

              <span>
                <UserRound size={13} />
                {members.length} thành viên
              </span>
            </div>
          </div>

          <div className="ptm-summary">
            <div className="ptm-summary-card">
              <span>Tổng nhiệm vụ</span>
              <strong>{tasks.length}</strong>
            </div>

            <div className="ptm-summary-card">
              <span>Đang thực hiện</span>
              <strong>
                {tasks.filter((task) => task.status === "doing").length}
              </strong>
            </div>

            <div className="ptm-summary-card">
              <span>Đã hoàn thành</span>
              <strong>
                {tasks.filter((task) => task.status === "done").length}
              </strong>
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: "20px 0 12px" }}>
            Danh sách nhiệm vụ
          </h3>

          {tasks.length === 0 ? (
            <div className="ptm-empty">
              Dự án chưa có nhiệm vụ. Nhấn “Giao nhiệm vụ” để bắt đầu.
            </div>
          ) : (
            <div className="ptm-task-list">
              {tasks.map((task) => {
                const progress = Math.min(
                  100,
                  Math.max(0, Number(task.progress) || 0)
                );

                return (
                  <article
                    className="ptm-task-card"
                    key={task._id}
                  >
                    <div className="ptm-task-head">
                      <div style={{ minWidth: 0 }}>
                        <h3>{task.title}</h3>

                        <div className="ptm-meta">
                          <span>
                            <UserRound size={13} />
                            {getMemberName(task.assignee)}
                          </span>

                          <span>
                            <CalendarDays size={13} />
                            {formatDate(task.startDate)} – {formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>

                      <button
                        className="ptm-delete"
                        type="button"
                        title="Xóa nhiệm vụ"
                        disabled={deletingId === task._id}
                        onClick={() => setTaskToDelete(task)}
                      >
                        {deletingId === task._id ? (
                          <RefreshCw size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>

                    <p>
                      {task.description || "Không có mô tả."}
                    </p>

                    <div
                      className="ptm-task-head"
                      style={{ marginBottom: 7 }}
                    >
                      <span className={`ptm-status ${task.status || "todo"}`}>
                        {taskStatusLabels[task.status] || "Chưa bắt đầu"}
                      </span>

                      <strong style={{ fontSize: 12 }}>
                        {progress}%
                      </strong>
                    </div>

                    <div className="ptm-progress">
                      <div style={{ width: `${progress}%` }} />
                    </div>

                    {task.employeeNote && (
                      <p>
                        <strong>Ghi chú cập nhật:</strong>{" "}
                        {task.employeeNote}
                      </p>
                    )}

                    {Array.isArray(task.attachments) &&
                      task.attachments.length > 0 && (
                        <div className="ptm-files">
                          {task.attachments.map((file, index) => (
                            <div
                              className="ptm-file-item"
                              key={file._id || `${file.filename || file.path}-${index}`}
                            >
                              <a
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

                              <button
                                type="button"
                                className="ptm-file-delete"
                                title="Xóa tệp đính kèm"
                                disabled={
                                  deletingAttachmentId === file._id ||
                                  Boolean(deletingId)
                                }
                                onClick={() => setAttachmentToDelete({ task, file })}
                              >
                                {deletingAttachmentId === file._id ? (
                                  <RefreshCw size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FORM GIAO NHIỆM VỤ */}
      {showTaskForm && (
        <div
          className="ptm-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowTaskForm(false);
            }
          }}
        >
          <form
            className="ptm-modal"
            onSubmit={submitTask}
          >
            <div className="ptm-modal-head">
              <h2>Giao nhiệm vụ mới</h2>

              <button
                className="ptm-close"
                type="button"
                onClick={() => setShowTaskForm(false)}
                disabled={saving}
              >
                <X size={17} />
              </button>
            </div>

            <div className="ptm-form-grid">
              <div className="ptm-field full">
                <label>Tên nhiệm vụ *</label>

                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="Nhập tên nhiệm vụ"
                />
              </div>

              <div className="ptm-field full">
                <label>Mô tả chi tiết</label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Nội dung cần thực hiện, yêu cầu và kết quả mong muốn..."
                />
              </div>

              <div className="ptm-field full">
                <label>Giao cho thành viên *</label>

                <select
                  required
                  value={form.assignee}
                  onChange={(event) =>
                    updateField("assignee", event.target.value)
                  }
                >
                  <option value="">-- Chọn thành viên --</option>

                  {members.map((member) => (
                    <option
                      key={getId(member)}
                      value={getId(member)}
                    >
                      {member.name || member.fullName || "Thành viên"}
                      {member.employeeCode
                        ? ` - ${member.employeeCode}`
                        : ""}
                    </option>
                  ))}
                </select>

                {members.length === 0 && (
                  <small>
                    Hãy thêm thành viên vào dự án trước khi giao việc.
                  </small>
                )}
              </div>

              <div className="ptm-field">
                <label>Ngày bắt đầu</label>

                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    updateField("startDate", event.target.value)
                  }
                />
              </div>

              <div className="ptm-field">
                <label>Hạn hoàn thành</label>

                <input
                  type="date"
                  min={form.startDate || undefined}
                  value={form.dueDate}
                  onChange={(event) =>
                    updateField("dueDate", event.target.value)
                  }
                />
              </div>

              <div className="ptm-field full">
                <label>Ảnh và tài liệu đính kèm</label>

                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  onChange={(event) =>
                    setFiles(Array.from(event.target.files || []))
                  }
                />

                <small>
                  Tối đa 10 tệp, mỗi tệp không quá 10MB.
                </small>

                {files.length > 0 && (
                  <small>
                    Đã chọn: {files.map((file) => file.name).join(", ")}
                  </small>
                )}
              </div>
            </div>

            <div className="ptm-modal-actions">
              <button
                className="ptm-secondary"
                type="button"
                onClick={() => setShowTaskForm(false)}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="ptm-primary"
                type="submit"
                disabled={saving || members.length === 0}
              >
                {saving ? "Đang giao..." : "Xác nhận giao việc"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA NHIỆM VỤ */}
      {taskToDelete && (
        <div
          className="ptm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingId
            ) {
              setTaskToDelete(null);
            }
          }}
        >
          <div
            className="ptm-modal ptm-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ptm-confirm-title"
          >
            <div className="ptm-confirm-icon">
              <AlertTriangle size={25} />
            </div>

            <h2
              className="ptm-confirm-title"
              id="ptm-confirm-title"
            >
              Xóa nhiệm vụ này?
            </h2>

            <p className="ptm-confirm-text">
              Bạn có chắc chắn muốn xóa nhiệm vụ này không?
              Dữ liệu nhiệm vụ và các file đính kèm sẽ bị xóa
              khỏi dự án và không thể khôi phục.
            </p>

            <div className="ptm-confirm-task">
              {taskToDelete.title || "Nhiệm vụ đã chọn"}
            </div>

            <div className="ptm-modal-actions">
              <button
                className="ptm-secondary"
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Hủy bỏ
              </button>

              <button
                className="ptm-danger"
                type="button"
                onClick={deleteTask}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? (
                  <>
                    <RefreshCw size={14} />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Xóa nhiệm vụ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

{attachmentToDelete && (
  <div
    className="ptm-overlay"
    role="presentation"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !deletingAttachmentId
      ) {
        setAttachmentToDelete(null);
      }
    }}
  >
    <div
      className="ptm-modal ptm-file-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ptm-file-confirm-title"
    >
      <div className="ptm-file-confirm-icon">
        <AlertTriangle size={26} />
      </div>

      <h2
        className="ptm-file-confirm-title"
        id="ptm-file-confirm-title"
      >
        Xóa tệp đính kèm?
      </h2>

      <p className="ptm-file-confirm-description">
        Bạn có chắc chắn muốn xóa tệp này không?
        Tệp sẽ bị gỡ khỏi nhiệm vụ và yêu cầu xóa khỏi Cloudinary.
      </p>

      <div className="ptm-file-confirm-name">
        {String(
          attachmentToDelete.file.mimeType || ""
        ).startsWith("image/") ? (
          <ImageIcon size={17} />
        ) : (
          <FileText size={17} />
        )}

        <span>
          {attachmentToDelete.file.originalName || "Tệp đính kèm"}
        </span>
      </div>

      <div className="ptm-file-confirm-actions">
        <button
          className="ptm-file-cancel"
          type="button"
          disabled={Boolean(deletingAttachmentId)}
          onClick={() => setAttachmentToDelete(null)}
        >
          Hủy bỏ
        </button>

        <button
          className="ptm-file-confirm-delete"
          type="button"
          disabled={Boolean(deletingAttachmentId)}
          onClick={deleteAttachment}
        >
          {deletingAttachmentId ? (
            <>
              <RefreshCw size={14} />
              Đang xóa...
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Xác nhận xóa
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

    </section>
  );
}

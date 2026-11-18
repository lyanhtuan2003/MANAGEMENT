import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  X,
  CheckCheck,
  FolderKanban,
  Clock3,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const formatTime = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function EmployeeNotifications({ onOpenProjects }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy phiên đăng nhập.");
    }

    const response = await fetch(`${API_URL}/notifications${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Không thể tải thông báo.");
    }

    return data;
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await request("/me");

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : []
      );

      setUnreadCount(Number(data.unreadCount || 0));
    } catch (error) {
      console.error("Load employee notifications:", error);
    }
  }, [request]);

  useEffect(() => {
    loadNotifications();

    // Tự kiểm tra thông báo mới định kỳ.
    const interval = window.setInterval(loadNotifications, 15000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const markRead = async (id) => {
    try {
      await request(`/${id}/read`, { method: "PATCH" });
      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const markAllRead = async () => {
    try {
      setLoading(true);
      await request("/read-all", { method: "PATCH" });
      await loadNotifications();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (notification) => {
    if (!notification.isRead) {
      await markRead(notification._id);
    }

    if (notification.type === "project_assigned" ||
        notification.type === "project_updated") {
      setOpen(false);

      if (typeof onOpenProjects === "function") {
        onOpenProjects();
      }
    }
  };

  return (
    <>
      <style>{`
        .employee-notification-wrap{position:relative;display:flex;align-items:center}
        .employee-notification-button{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border:1px solid #e8edf5;border-radius:11px;background:#fff;color:#64748b;cursor:pointer}
        .employee-notification-button:hover,.employee-notification-button.active{background:#eff6ff;color:#3986e8;border-color:#bfdbfe}
        .employee-notification-count{position:absolute;top:-7px;right:-7px;min-width:19px;height:19px;padding:0 4px;border:2px solid white;border-radius:20px;background:#ef4444;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .employee-notification-backdrop{position:fixed;inset:0;z-index:998;background:transparent}
        .employee-notification-popup{position:absolute;top:calc(100% + 14px);right:-12px;width:370px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #e9edf4;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.13);z-index:999;overflow:hidden}
        .employee-notification-popup-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #edf0f5}
        .employee-notification-popup-head h3{margin:0;color:#172b4d;font-size:15px}
        .employee-notification-popup-head p{margin:5px 0 0;color:#94a3b8;font-size:11px}
        .employee-notification-close{width:30px;height:30px;border:0;border-radius:8px;background:#f1f5f9;color:#64748b;cursor:pointer}
        .employee-notification-readall{width:100%;padding:11px 17px;display:flex;align-items:center;justify-content:flex-end;gap:7px;border:0;border-bottom:1px solid #edf0f5;background:#fff;color:#3986e8;font-size:11px;font-weight:600;cursor:pointer}
        .employee-notification-items{max-height:390px;overflow:auto}
        .employee-notification-row{width:100%;display:flex;align-items:flex-start;gap:11px;padding:15px;border:0;border-bottom:1px solid #f0f2f6;background:#fff;text-align:left;cursor:pointer}
        .employee-notification-row.unread{background:#f4f8ff}
        .employee-notification-row:hover{background:#f8fafc}
        .employee-notification-row-icon{width:37px;height:37px;min-width:37px;display:grid;place-items:center;border-radius:10px;background:#eaf2ff;color:#3986e8}
        .employee-notification-row-content{flex:1;min-width:0}
        .employee-notification-row-content strong{display:block;margin-bottom:5px;color:#26364f;font-size:12px}
        .employee-notification-row-content p{margin:0 0 7px;color:#64748b;font-size:11px;line-height:1.6}
        .employee-notification-row-content span{display:flex;align-items:center;gap:5px;color:#94a3b8;font-size:10px}
        .employee-notification-unread-dot{width:8px;height:8px;min-width:8px;margin-top:5px;border-radius:50%;background:#3986e8}
        .employee-notification-empty{padding:35px 20px;text-align:center;color:#94a3b8;font-size:12px}
        @media(max-width:600px){.employee-notification-popup{position:fixed;top:65px;right:12px}}
      `}</style>

      <div className="employee-notification-wrap">
        <button
          type="button"
          className={`employee-notification-button ${open ? "active" : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-label="Thông báo"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="employee-notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <>
            <button
              type="button"
              className="employee-notification-backdrop"
              aria-label="Đóng thông báo"
              onClick={() => setOpen(false)}
            />

            <div className="employee-notification-popup">
              <div className="employee-notification-popup-head">
                <div>
                  <h3>Thông báo</h3>
                  <p>Bạn có {unreadCount} thông báo chưa đọc</p>
                </div>

                <button
                  type="button"
                  className="employee-notification-close"
                  onClick={() => setOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <button
                type="button"
                className="employee-notification-readall"
                onClick={markAllRead}
                disabled={loading || unreadCount === 0}
              >
                <CheckCheck size={14} />
                Đánh dấu tất cả đã đọc
              </button>

              <div className="employee-notification-items">
                {notifications.length === 0 ? (
                  <div className="employee-notification-empty">
                    <Bell size={27} />
                    <p>Bạn chưa có thông báo nào.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification._id}
                      className={`employee-notification-row ${notification.isRead ? "" : "unread"}`}
                      onClick={() => handleClick(notification)}
                    >
                      <div className="employee-notification-row-icon">
                        <FolderKanban size={18} />
                      </div>

                      <div className="employee-notification-row-content">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <span>
                          <Clock3 size={12} />
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>

                      {!notification.isRead && (
                        <span className="employee-notification-unread-dot" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
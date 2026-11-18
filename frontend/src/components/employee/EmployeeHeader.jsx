
import { useCallback, useEffect, useState } from "react";
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  CalendarCheck,
  CalendarX,
  FolderKanban,
  CheckCheck,
  X,
  Clock,
  BellRing,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

export default function EmployeeHeader({
  setOpen,
  title,
  employeeName,
  user,
  onOpenProjects,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const displayName =
    employeeName ||
    user?.name ||
    "Nhân viên";

  // GỌI API THÔNG BÁO
  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
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
      throw new Error(data.message || "Không thể tải thông báo.");
    }

    return data;
  }, []);

  // TẢI DANH SÁCH THÔNG BÁO
  const loadNotifications = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoadingNotifications(true);

      setNotificationError("");

      const data = await apiRequest("/notifications/me");

      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : []
      );

      setUnreadCount(
        Number(data.unreadCount) ||
        (data.notifications || []).filter((item) => !item.isRead).length
      );
    } catch (error) {
      console.error("Load notifications error:", error);
      setNotificationError(error.message);
    } finally {
      if (showLoading) setLoadingNotifications(false);
    }
  }, [apiRequest]);

  // TỰ ĐỘNG CẬP NHẬT THÔNG BÁO MỖI 15 GIÂY
  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
  const markAsRead = async (notification) => {
    if (notification.isRead) return;

    try {
      await apiRequest(
        `/notifications/${notification._id}/read`,
        { method: "PATCH" }
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      console.error("Mark notification read error:", error);
      setNotificationError(error.message);
    }
  };

  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  const markAllAsRead = async () => {
    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      setNotificationError(error.message);
    }
  };

  // NHẤN VÀO THÔNG BÁO
  const handleNotificationClick = async (notification) => {
    await markAsRead(notification);

    setShowNotifications(false);

    if (
      notification.type === "project_assigned" ||
      notification.type === "project_updated" ||
      notification.project
    ) {
      onOpenProjects?.();
    }
  };

  // ĐỊNH DẠNG THỜI GIAN
  const formatTime = (date) => {
    if (!date) return "";

    const diff = Date.now() - new Date(date).getTime();

    if (Number.isNaN(diff)) return "";

    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days} ngày trước`;

    return new Date(date).toLocaleDateString("vi-VN");
  };

  // ICON THEO LOẠI THÔNG BÁO
  const getNotificationIcon = (notification) => {
    if (
      notification.type === "project_assigned" ||
      notification.type === "project_updated"
    ) {
      return <FolderKanban size={20} />;
    }

    if (
      notification.type === "leave_approved" ||
      notification.status === "approved" ||
      notification.status === "Đã duyệt"
    ) {
      return <CalendarCheck size={20} />;
    }

    if (
      notification.type === "leave_rejected" ||
      notification.status === "rejected" ||
      notification.status === "Từ chối"
    ) {
      return <CalendarX size={20} />;
    }

    return <BellRing size={20} />;
  };

  const getNotificationClass = (notification) => {
    if (
      notification.type === "project_assigned" ||
      notification.type === "project_updated"
    ) {
      return "project";
    }

    if (
      notification.type === "leave_approved" ||
      notification.status === "approved"
    ) {
      return "approved";
    }

    if (
      notification.type === "leave_rejected" ||
      notification.status === "rejected"
    ) {
      return "rejected";
    }

    return "default";
  };

  return (
    <header className="employee-header">

      {/* BÊN TRÁI */}
      <div className="employee-header-left">
        <button
          className="employee-menu-toggle"
          onClick={() => setOpen?.(true)}
          type="button"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <div className="employee-breadcrumb">
            Trang chủ / <strong>{title}</strong>
          </div>

          <h3>{title}</h3>
        </div>
      </div>

      {/* BÊN PHẢI */}
      <div className="employee-header-right">

        <div className="employee-header-search">
          <Search size={17} />
          <input placeholder="Tìm kiếm..." />
        </div>

        {/* CHUÔNG THÔNG BÁO DUY NHẤT */}
        <div className="employee-notification-wrapper">

          <button
            type="button"
            className={`employee-notification ${
              showNotifications ? "active" : ""
            }`}
            onClick={() => {
              setShowNotifications((previous) => !previous);
              if (!showNotifications) {
                loadNotifications(true);
              }
            }}
            aria-label="Thông báo"
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="employee-notification-dot">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="employee-notification-backdrop"
                onClick={() => setShowNotifications(false)}
              />

              <div className="employee-notification-dropdown">

                {/* TIÊU ĐỀ */}
                <div className="employee-notification-heading">
                  <div>
                    <h3>Thông báo</h3>
                    <p>
                      Bạn có {unreadCount} thông báo chưa đọc
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="employee-notification-close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* ĐÁNH DẤU TẤT CẢ */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="employee-notification-read-all"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck size={15} />
                    Đánh dấu tất cả đã đọc
                  </button>
                )}

                {/* DANH SÁCH THÔNG BÁO */}
                <div className="employee-notification-list">

                  {loadingNotifications ? (
                    <div className="employee-notification-empty">
                      <Clock size={28} />
                      <p>Đang tải thông báo...</p>
                    </div>
                  ) : notificationError ? (
                    <div className="employee-notification-empty">
                      <Bell size={30} />
                      <strong>Không thể tải thông báo</strong>
                      <p>{notificationError}</p>
                      <button
                        type="button"
                        onClick={() => loadNotifications(true)}
                      >
                        Thử lại
                      </button>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        className={`employee-notification-item ${
                          !item.isRead ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <div
                          className={`employee-notification-icon ${getNotificationClass(item)}`}
                        >
                          {getNotificationIcon(item)}
                        </div>

                        <div className="employee-notification-content">
                          <strong>{item.title}</strong>

                          <p>{item.message}</p>

                          <span>
                            <Clock size={12} />
                            {formatTime(item.createdAt)}
                          </span>
                        </div>

                        {!item.isRead && (
                          <span className="employee-notification-unread-dot" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="employee-notification-empty">
                      <Bell size={35} />
                      <strong>Chưa có thông báo</strong>
                      <p>
                        Các thông báo về dự án và nghỉ phép sẽ xuất hiện ở đây.
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* THÔNG TIN NHÂN VIÊN */}
        <div className="employee-header-profile">
          <div className="employee-avatar">
            {(displayName.trim().split(" ").pop() || "NV")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="employee-header-user">
            <strong>{displayName}</strong>
            <span>Nhân viên</span>
          </div>

          <ChevronDown size={15} />
        </div>

      </div>
    </header>
  );
}

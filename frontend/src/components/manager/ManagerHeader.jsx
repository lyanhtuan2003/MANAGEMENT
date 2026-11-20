import { useState } from "react";
import {
  Bell,
  Menu,
  Search,
  X,
  CheckCheck,
  CalendarDays,
  Clock,
} from "lucide-react";

const safeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Có" : "Không";
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? fallback
      : value.toLocaleString("vi-VN");
  }

  if (typeof value === "object") {
    if (typeof value.name === "string") return value.name;
    if (typeof value.title === "string") return value.title;
    if (typeof value.label === "string") return value.label;
    if (typeof value.message === "string") return value.message;
  }

  return fallback;
};

export default function ManagerHeader({
  setOpen,
  title,
  notifications = [],
  onMarkAllRead,
  onNotificationClick,
  user,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationList = Array.isArray(notifications)
    ? notifications
    : [];

  const isRead = (item) =>
    Boolean(item?.isRead ?? item?.read ?? false);

  const unreadCount = notificationList.filter(
    (item) => !isRead(item)
  ).length;

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const handleNotificationClick = (item) => {
    onNotificationClick?.(item);
    setShowNotifications(false);
  };

  const userName = safeText(
    user?.name || user?.fullName,
    "Quản lý"
  );

  const avatarText = userName.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="manager-header">
      <div className="manager-header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setOpen?.(true)}
          aria-label="Mở menu"
        >
          <Menu size={23} />
        </button>

        <div className="manager-page-title">
          <h1>{safeText(title, "Tổng quan hệ thống")}</h1>
        </div>

        <div className="manager-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm thông tin..."
          />
        </div>
      </div>

      <div className="manager-header-right">
        <div className="manager-notification-wrapper">
          <button
            type="button"
            className={`notification-btn ${
              showNotifications ? "active" : ""
            }`}
            onClick={() =>
              setShowNotifications((previous) => !previous)
            }
            aria-label="Thông báo"
            aria-expanded={showNotifications}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="notification-dot">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <button
                type="button"
                className="manager-notification-backdrop"
                aria-label="Đóng thông báo"
                onClick={() => setShowNotifications(false)}
              />

              <div className="manager-notification-dropdown">
                <div className="manager-notification-heading">
                  <div>
                    <h3>Thông báo</h3>
                    <p>
                      {unreadCount > 0
                        ? `Bạn có ${unreadCount} thông báo chưa đọc`
                        : "Bạn đã xem tất cả thông báo"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="manager-notification-close"
                    onClick={() => setShowNotifications(false)}
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                {notificationList.length > 0 && (
                  <button
                    type="button"
                    className="manager-notification-read-all"
                    onClick={onMarkAllRead}
                    disabled={unreadCount === 0}
                  >
                    <CheckCheck size={15} />
                    Đánh dấu tất cả đã đọc
                  </button>
                )}

                <div className="manager-notification-list">
                  {notificationList.length > 0 ? (
                    notificationList.map((item, index) => {
                      const read = isRead(item);
                      const id = item?._id || item?.id || index;

                      return (
                        <button
                          type="button"
                          key={String(id)}
                          className={`manager-notification-item ${
                            read ? "" : "unread"
                          }`}
                          onClick={() =>
                            handleNotificationClick(item)
                          }
                        >
                          <div className="manager-notification-icon">
                            <CalendarDays size={19} />
                          </div>

                          <div className="manager-notification-content">
                            <strong>
                              {safeText(
                                item?.title,
                                "Thông báo mới"
                              )}
                            </strong>

                            <p>
                              {safeText(
                                item?.message,
                                "Bạn có một thông báo mới."
                              )}
                            </p>

                            <span>
                              <Clock size={12} />
                              {formatTime(item?.createdAt)}
                            </span>
                          </div>

                          {!read && (
                            <span className="manager-unread-dot" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="manager-notification-empty">
                      <Bell size={35} />
                      <strong>Chưa có thông báo</strong>
                      <p>
                        Khi có thông báo mới, nội dung sẽ xuất hiện
                        tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="header-user">
          <div className="avatar">{avatarText}</div>

          <div className="header-user-info">
            <strong>{userName}</strong>
            <span>
              {safeText(user?.role, "Administrator") === "accountant"
                ? "Kế toán"
                : "Administrator"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
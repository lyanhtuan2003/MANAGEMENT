
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

export default function ManagerHeader({
  setOpen,
  notifications = [],
  onMarkAllRead,
  onNotificationClick,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const handleNotificationClick = (item) => {
    onNotificationClick?.(item);
    setShowNotifications(false);
  };

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

  return (
    <header className="manager-header">
      <div className="manager-header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setOpen(true)}
        >
          <Menu size={23} />
        </button>

        <div className="manager-search">
          <Search size={18} />
          <input placeholder="Tìm kiếm thông tin..." />
        </div>
      </div>

      <div className="manager-header-right">
        {/* THÔNG BÁO */}
        <div className="manager-notification-wrapper">
          <button
            type="button"
            className={`notification-btn ${
              showNotifications ? "active" : ""
            }`}
            onClick={() =>
              setShowNotifications((prev) => !prev)
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
                  >
                    <X size={18} />
                  </button>
                </div>

                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="manager-notification-read-all"
                    onClick={onMarkAllRead}
                  >
                    <CheckCheck size={15} />
                    Đánh dấu tất cả đã đọc
                  </button>
                )}

                <div className="manager-notification-list">
                  {notifications.length > 0 ? (
                    notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`manager-notification-item ${
                          item.read ? "" : "unread"
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
                            {item.title || "Có đơn nghỉ phép mới"}
                          </strong>

                          <p>
                            {item.message ||
                              `${item.employee || "Nhân viên"} vừa gửi đơn xin nghỉ phép.`}
                          </p>

                          <span>
                            <Clock size={12} />
                            {formatTime(item.createdAt)}
                          </span>
                        </div>

                        {!item.read && (
                          <span className="manager-unread-dot" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="manager-notification-empty">
                      <Bell size={35} />

                      <strong>Chưa có thông báo</strong>

                      <p>
                        Khi nhân viên gửi đơn xin nghỉ phép,
                        thông báo sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* TÀI KHOẢN SẾP */}
        <div className="header-user">
          <div className="avatar">S</div>

          <div className="header-user-info">
            <strong>Quản lý</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

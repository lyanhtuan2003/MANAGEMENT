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
  user,
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  const isRead = (item) => {
    return item.isRead ?? item.read ?? false;
  };

  const unreadCount = notifications.filter(
    (item) => !isRead(item)
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

  const getNotificationId = (item) => {
    return item._id || item.id;
  };

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
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                {notifications.length > 0 && (
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
                  {notifications.length > 0 ? (
                    notifications.map((item) => {
                      const read = isRead(item);

                      return (
                        <button
                          type="button"
                          key={getNotificationId(item)}
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
                              {item.title || "Thông báo mới"}
                            </strong>

                            <p>
                              {item.message ||
                                "Bạn có một thông báo mới."}
                            </p>

                            <span>
                              <Clock size={12} />
                              {formatTime(item.createdAt)}
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
          <div className="avatar">
            {(user?.name || user?.fullName || "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="header-user-info">
            <strong>
              {user?.name || user?.fullName || "Quản lý"}
            </strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
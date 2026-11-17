
import { Bell, Menu, Search } from "lucide-react";

export default function ManagerHeader({ setOpen }) {
  return (
    <header className="manager-header">
      <div className="manager-header-left">
        <button
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
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-dot" />
        </button>

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

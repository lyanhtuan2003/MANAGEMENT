import {
  Menu,
  Bell,
  Search,
  ChevronDown,
} from "lucide-react";

export default function EmployeeHeader({
  setOpen,
  title,
}) {
  return (
    <header className="employee-header">
      <div className="employee-header-left">
        <button
          className="employee-menu-toggle"
          onClick={() => setOpen(true)}
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

      <div className="employee-header-right">
        <div className="employee-header-search">
          <Search size={17} />
          <input placeholder="Tìm kiếm..." />
        </div>

        <button className="employee-notification">
          <Bell size={20} />
          <span />
        </button>

        <div className="employee-header-profile">
          <div className="employee-avatar">AN</div>

          <div className="employee-header-user">
            <strong>Nguyễn Văn An</strong>
            <span>Nhân viên</span>
          </div>

          <ChevronDown size={15} />
        </div>
      </div>
    </header>
  );
}
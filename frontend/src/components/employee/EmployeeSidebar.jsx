import {
  LayoutDashboard,
  Clock,
  Wallet,
  CalendarDays,
  BriefcaseBusiness,
  UserRound,
  LogOut,
  X,
  Building2,
} from "lucide-react";

const menus = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "attendance", label: "Chấm công", icon: Clock },
  { id: "payroll", label: "Bảng lương", icon: Wallet },
  { id: "leave", label: "Xin nghỉ phép", icon: CalendarDays },
  { id: "projects", label: "Dự án của tôi", icon: BriefcaseBusiness },
  { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound },
];

export default function EmployeeSidebar({
  activePage,
  setActivePage,
  open,
  setOpen,
  onLogout,
}) {
  return (
    <>
      {open && (
        <div
          className="employee-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`employee-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="employee-brand">
          <div className="employee-brand-icon">
            <Building2 size={23} />
          </div>

          <div>
            <h2>Internal</h2>
            <span>Management System</span>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="employee-menu-label">
          MENU NHÂN VIÊN
        </div>

        <nav className="employee-nav">
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`employee-nav-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="employee-sidebar-bottom">
          <div className="employee-sidebar-user">
            <div className="employee-avatar">AN</div>

            <div className="employee-user-info">
              <strong>Nguyễn Văn An</strong>
              <span>Nhân viên</span>
            </div>
          </div>

          <button className="employee-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}
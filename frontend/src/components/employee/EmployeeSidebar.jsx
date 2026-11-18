
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
  KeyRound,
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
  user,
}) {
  const employeeName = user?.name || "Nhân viên";
  const employeeCode = user?.employeeCode || "Tài khoản nhân viên";

  const avatar = employeeName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const handleNavigate = (page) => {
    setActivePage(page);
    setOpen(false);
  };

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  return (
    <>
      {/* OVERLAY MOBILE */}
      {open && (
        <div
          className="employee-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`employee-sidebar ${open ? "sidebar-open" : ""}`}>
        {/* LOGO */}
        <div className="employee-brand">
          <div className="employee-brand-icon">
            <Building2 size={23} />
          </div>

          <div>
            <h2>Internal</h2>
            <span>Management System</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* TIÊU ĐỀ MENU */}
        <div className="employee-menu-label">
          MENU NHÂN VIÊN
        </div>

        {/* DANH SÁCH MENU */}
        <nav className="employee-nav">
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.id}
                className={`employee-nav-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => handleNavigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* KHU VỰC TÀI KHOẢN */}
        <div className="employee-sidebar-bottom">
          {/* THÔNG TIN NHÂN VIÊN */}
          <div className="employee-sidebar-user">
            <div className="employee-avatar">
              {avatar || "NV"}
            </div>

            <div className="employee-user-info">
              <strong title={employeeName}>
                {employeeName}
              </strong>

              <span title={employeeCode}>
                {employeeCode}
              </span>
            </div>
          </div>

          {/* ĐỔI MẬT KHẨU */}
          <button
            type="button"
            className={`employee-logout employee-change-password ${
              activePage === "changePassword" ? "active" : ""
            }`}
            onClick={() => handleNavigate("changePassword")}
          >
            <KeyRound size={18} />
            <span>Đổi mật khẩu</span>
          </button>

          {/* ĐĂNG XUẤT */}
          <button
            type="button"
            className="employee-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}

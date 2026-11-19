
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
  ArrowLeftRight,
} from "lucide-react";

// ========================================
// MENU DÙNG CHUNG
// ========================================

const commonMenus = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "attendance",
    label: "Chấm công",
    icon: Clock,
  },
  {
    id: "payroll",
    label: "Bảng lương",
    icon: Wallet,
  },
  {
    id: "leave",
    label: "Xin nghỉ phép",
    icon: CalendarDays,
  },
  {
    id: "projects",
    label: "Dự án của tôi",
    icon: BriefcaseBusiness,
  },
  {
    id: "profile",
    label: "Hồ sơ cá nhân",
    icon: UserRound,
  },
];

// ========================================
// MENU KẾ TOÁN
// ========================================

const accountantMenus = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "finance",
    label: "Quản lý thu chi",
    icon: ArrowLeftRight,
  },
  {
    id: "attendance",
    label: "Chấm công",
    icon: Clock,
  },
  {
    id: "payroll",
    label: "Bảng lương",
    icon: Wallet,
  },
  {
    id: "leave",
    label: "Xin nghỉ phép",
    icon: CalendarDays,
  },
  {
    id: "projects",
    label: "Dự án của tôi",
    icon: BriefcaseBusiness,
  },
  {
    id: "profile",
    label: "Hồ sơ cá nhân",
    icon: UserRound,
  },
];

// ========================================
// EMPLOYEE SIDEBAR
// ========================================

export default function EmployeeSidebar({
  activePage,
  setActivePage,
  open,
  setOpen,
  onLogout,
  user,
  role,
}) {
  const currentRole =
    role ||
    user?.role ||
    localStorage.getItem("userRole") ||
    "employee";

  const isAccountant = currentRole === "accountant";

  const menus = isAccountant
    ? accountantMenus
    : commonMenus;

  const employeeName = user?.name || (
    isAccountant ? "Kế toán" : "Nhân viên"
  );

  const employeeCode =
    user?.employeeCode ||
    (isAccountant ? "Kế toán" : "Tài khoản nhân viên");

  const avatar = employeeName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // ========================================
  // CHUYỂN MENU
  // ========================================

  const handleNavigate = (page) => {
    // Chặn nhân viên truy cập thu chi
    if (page === "finance" && !isAccountant) {
      return;
    }

    setActivePage(page);
    setOpen(false);
  };

  // ========================================
  // ĐĂNG XUẤT
  // ========================================

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

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
      <aside
        className={`employee-sidebar ${
          open ? "sidebar-open" : ""
        }`}
      >

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
          {isAccountant ? "KHU VỰC KẾ TOÁN" : "MENU NHÂN VIÊN"}
        </div>

        {/* DANH SÁCH MENU */}
        <nav className="employee-nav">

          {menus.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`employee-nav-item ${
                  isActive ? "active" : ""
                }`}
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}

        </nav>

        {/* KHU VỰC TÀI KHOẢN */}
        <div className="employee-sidebar-bottom">

          {/* THÔNG TIN NGƯỜI DÙNG */}
          <div className="employee-sidebar-user">

            <div className="employee-avatar">
              {avatar || "NV"}
            </div>

            <div className="employee-user-info">

              <strong title={employeeName}>
                {employeeName}
              </strong>

              <span title={employeeCode}>
                {isAccountant ? "Kế toán" : employeeCode}
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

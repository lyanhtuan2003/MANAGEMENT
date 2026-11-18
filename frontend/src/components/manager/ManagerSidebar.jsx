
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FolderKanban,
  Gift,
  X,
  BriefcaseBusiness,
  LogOut,
  Clock,
  Wallet,
} from "lucide-react";

// ========================================
// DANH SÁCH MENU QUẢN LÝ
// ========================================

const menus = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "employees",
    label: "Quản lý nhân viên",
    icon: Users,
  },
  {
    id: "attendance",
    label: "Quản lý chấm công",
    icon: Clock,
  },
  {
    id: "payroll",
    label: "Quản lý bảng lương",
    icon: Wallet,
  },
  {
    id: "leaves",
    label: "Duyệt đơn nghỉ",
    icon: CalendarCheck,
  },
  {
    id: "projects",
    label: "Quản lý dự án",
    icon: FolderKanban,
  },
  {
    id: "rewards",
    label: "Thưởng & phạt",
    icon: Gift,
  },
];

// ========================================
// MANAGER SIDEBAR
// ========================================

export default function ManagerSidebar({
  activeTab,
  setActiveTab,
  open,
  setOpen,
  onLogout,
}) {
  // ======================================
  // ĐĂNG XUẤT
  // ======================================

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Sếp?"
    );

    if (confirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");

      window.location.href = "/login";
    }
  };

  // ======================================
  // CHUYỂN TAB
  // ======================================

  const handleNavigate = (id) => {
    setActiveTab(id);
    setOpen(false);
  };

  // ======================================
  // GIAO DIỆN
  // ======================================

  return (
    <>
      {/* OVERLAY MOBILE */}
      {open && (
        <div
          className="manager-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`manager-sidebar ${open ? "show" : ""}`}
      >
        {/* LOGO */}
        <div className="manager-brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={23} />
          </div>

          <div className="brand-info">
            <h2>Internal</h2>
            <span>Management System</span>
          </div>

          {/* ĐÓNG MENU MOBILE */}
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={21} />
          </button>
        </div>

        {/* TIÊU ĐỀ */}
        <div className="sidebar-section">
          QUẢN LÝ
        </div>

        {/* DANH SÁCH MENU */}
        <nav className="manager-nav">
          {menus.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`manager-nav-item ${
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
        <div className="sidebar-bottom">
          {/* PROFILE */}
          <div className="manager-profile-mini">
            <div className="avatar">
              S
            </div>

            <div className="profile-info">
              <strong>Quản trị viên</strong>
              <span>Quản lý hệ thống</span>
            </div>
          </div>

          {/* ĐĂNG XUẤT */}
          <button
            type="button"
            className="manager-logout-btn"
            onClick={handleLogout}
            title="Đăng xuất tài khoản Sếp"
          >
            <LogOut size={18} />

            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}

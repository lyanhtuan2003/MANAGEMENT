
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
  ArrowLeftRight,
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
  {
    id: "company-finance",
    label: "Quản lý thu chi",
    icon: ArrowLeftRight,
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
  user,
}) {
  const managerName = user?.name || "Quản trị viên";

  const avatar = managerName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // ========================================
  // ĐĂNG XUẤT
  // ========================================

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản lý?"
    );

    if (!confirmed) return;

    [
      "token",
      "authToken",
      "accessToken",
      "user",
      "userRole",
    ].forEach((key) => {
      localStorage.removeItem(key);
    });

    window.location.reload();
  };

  // ========================================
  // CHUYỂN TAB
  // ========================================

  const handleNavigate = (id) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(id);
    }

    if (typeof setOpen === "function") {
      setOpen(false);
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

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={21} />
          </button>
        </div>

        {/* TIÊU ĐỀ MENU */}
        <div className="sidebar-section">
          QUẢN LÝ
        </div>

        {/* DANH SÁCH MENU */}
        <nav className="manager-nav">
          {menus.map((item) => {
            const Icon = item.icon;

            const isActive =
              activeTab === item.id ||
              (item.id === "company-finance" &&
                activeTab === "finance");

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
          <div className="manager-profile-mini">
            <div className="avatar">
              {avatar || "S"}
            </div>

            <div className="profile-info">
              <strong>{managerName}</strong>
              <span>Quản lý hệ thống</span>
            </div>
          </div>

          {/* ĐĂNG XUẤT */}
          <button
            type="button"
            className="manager-logout-btn"
            onClick={handleLogout}
            title="Đăng xuất tài khoản quản lý"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
}

import { useCallback, useState } from "react";

import {
  LayoutDashboard,
  Wallet,
  UserRound,
  KeyRound,
  LogOut,
  Menu,
  X,
  Building2,
} from "lucide-react";

import EmployeeHeader from "../../components/employee/EmployeeHeader";
import MyProfile from "../../components/employee/MyProfile";
import ChangePassword from "../../components/employee/ChangePassword";
import AccountantCompanyFinance from "../../components/accountant/AccountantCompanyFinance";

import "./AccountantDashboard.css";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Không thể đọc thông tin tài khoản:", error);
    return {};
  }
};

const menus = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "finance", label: "Quản lý thu chi", icon: Wallet },
  { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound },
];

const pageTitles = {
  overview: "Tổng quan kế toán",
  finance: "Quản lý thu chi",
  profile: "Hồ sơ cá nhân",
  changePassword: "Đổi mật khẩu",
};

export default function AccountantDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);

  const mustChangePassword = Boolean(user?.mustChangePassword);

  const handleChangePage = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
    );

    if (!confirmed) return;

    [
      "token",
      "authToken",
      "accessToken",
      "user",
      "userRole",
    ].forEach((key) => localStorage.removeItem(key));

    window.location.reload();
  }, [onLogout]);

  const handlePasswordChanged = useCallback(
    (updatedUser) => {
      const nextUser = {
        ...user,
        ...(updatedUser || {}),
        mustChangePassword: false,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
      setActivePage("overview");
      setSidebarOpen(false);
    },
    [user]
  );

  const avatar = (user?.name || "K")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  if (mustChangePassword) {
    return (
      <ChangePassword
        user={user}
        required={true}
        onSuccess={handlePasswordChanged}
        onLogout={handleLogout}
      />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <div className="accountant-overview">
            <div className="accountant-welcome">
              <div>
                <span>KHÔNG GIAN LÀM VIỆC</span>
                <h2>Xin chào, {user?.name || "Kế toán"}!</h2>
                <p>
                  Theo dõi tình hình tài chính và quản lý các giao dịch
                  của công ty tại đây.
                </p>
              </div>

              <div className="accountant-welcome-icon">
                <Wallet size={35} />
              </div>
            </div>

            <div className="accountant-shortcut">
              <div>
                <h3>Quản lý tài chính công ty</h3>
                <p>
                  Theo dõi tổng thu, tổng chi, số dư và lịch sử giao dịch.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleChangePage("finance")}
              >
                <Wallet size={17} />
                Mở quản lý thu chi
              </button>
            </div>
          </div>
        );

      case "finance":
        return <AccountantCompanyFinance />;

      case "profile":
        return <MyProfile />;

      case "changePassword":
        return (
          <ChangePassword
            user={user}
            required={false}
            onSuccess={handlePasswordChanged}
            onLogout={handleLogout}
          />
        );

      default:
        return <AccountantCompanyFinance />;
    }
  };

  return (
    <div className="accountant-app">
      {sidebarOpen && (
        <div
          className="accountant-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`accountant-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
      >
        <div className="accountant-brand">
          <div className="accountant-brand-icon">
            <Building2 size={23} />
          </div>

          <div>
            <h2>Internal</h2>
            <span>Management System</span>
          </div>

          <button
            type="button"
            className="accountant-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="accountant-menu-title">
          KHU VỰC KẾ TOÁN
        </div>

        <nav className="accountant-nav">
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.id}
                className={`accountant-nav-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => handleChangePage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="accountant-sidebar-bottom">
          <div className="accountant-user">
            <div className="accountant-avatar">
              {avatar || "K"}
            </div>

            <div>
              <strong>{user?.name || "Kế toán"}</strong>
              <span>Kế toán</span>
            </div>
          </div>

          <button
            type="button"
            className={`accountant-logout accountant-change-password ${
              activePage === "changePassword" ? "active" : ""
            }`}
            onClick={() => handleChangePage("changePassword")}
          >
            <KeyRound size={18} />
            <span>Đổi mật khẩu</span>
          </button>

          <button
            type="button"
            className="accountant-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="accountant-main">
        <div className="accountant-mobile-bar">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={22} />
          </button>

          <strong>Internal Management</strong>
        </div>

        <EmployeeHeader
          setOpen={setSidebarOpen}
          title={pageTitles[activePage] || "Khu vực kế toán"}
          user={user}
        />

        <div className="accountant-content">
          {renderPage()}
        </div>

        <footer className="accountant-footer">
          © 2026 Internal Management. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

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
  ShieldAlert,
} from "lucide-react";

import EmployeeHeader from "../../components/employee/EmployeeHeader";
import MyProfile from "../../components/employee/MyProfile";
import ChangePassword from "../../components/employee/ChangePassword";

import AccountantCompanyFinance from "../../components/accountant/AccountantCompanyFinance";

import "./AccountantDashboard.css";

// ========================================
// LẤY THÔNG TIN NGƯỜI DÙNG
// ========================================

const getStoredUser = () => {
  try {
    const keys = ["user", "currentUser", "authUser"];

    for (const key of keys) {
      const value = localStorage.getItem(key);

      if (!value) continue;

      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object") {
        return parsed.user || parsed.data?.user || parsed;
      }
    }

    return {};
  } catch (error) {
    console.error("Lỗi đọc thông tin người dùng:", error);
    return {};
  }
};

// ========================================
// MENU KẾ TOÁN
// ========================================

const menus = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "finance",
    label: "Quản lý thu chi",
    icon: Wallet,
  },
  {
    id: "profile",
    label: "Hồ sơ cá nhân",
    icon: UserRound,
  },
];

const pageTitles = {
  overview: "Tổng quan kế toán",
  finance: "Quản lý thu chi",
  profile: "Hồ sơ cá nhân",
  changePassword: "Đổi mật khẩu",
};

// ========================================
// ACCOUNTANT DASHBOARD
// ========================================

export default function AccountantDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const mustChangePassword = Boolean(user?.mustChangePassword);

  // ========================================
  // CHUYỂN TRANG
  // ========================================

  const handleChangePage = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  // ========================================
  // ĐĂNG XUẤT
  // Không sử dụng window.confirm()
  // ========================================

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    [
      "token",
      "authToken",
      "accessToken",
      "user",
      "currentUser",
      "authUser",
      "userRole",
    ].forEach((key) => {
      localStorage.removeItem(key);
    });

    window.location.href = "/login";
  }, [onLogout]);

  // ========================================
  // SAU KHI ĐỔI MẬT KHẨU
  // ========================================

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

  // ========================================
  // AVATAR
  // ========================================

  const avatar = (user?.name || "K")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // ========================================
  // NỘI DUNG TỪNG TRANG
  // ========================================

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <div className="accountant-overview">
            <div className="accountant-welcome">
              <div>
                <span>KHÔNG GIAN LÀM VIỆC</span>

                <h2>
                  Xin chào, {user?.name || "Kế toán"}!
                </h2>

                <p>
                  Theo dõi tình hình tài chính và quản lý
                  các giao dịch của công ty tại đây.
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
                  Theo dõi tổng thu, tổng chi, số dư
                  và lịch sử giao dịch.
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

  // ========================================
  // BẮT BUỘC ĐỔI MẬT KHẨU
  // ========================================

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

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <div className="accountant-app">
      <style>{`
        .accountant-logout-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          animation: accountantLogoutFade 0.2s ease;
        }

        .accountant-logout-modal {
          position: relative;
          width: 100%;
          max-width: 410px;
          padding: 30px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
          text-align: center;
          animation: accountantLogoutIn 0.25s ease;
        }

        .accountant-logout-close {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 9px;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
        }

        .accountant-logout-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .accountant-logout-icon {
          width: 66px;
          height: 66px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #fff1f2;
          color: #ef4444;
        }

        .accountant-logout-modal h3 {
          margin: 0 0 9px;
          color: #1e293b;
          font-size: 21px;
          font-weight: 750;
        }

        .accountant-logout-modal p {
          margin: 0 auto;
          max-width: 310px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .accountant-logout-actions {
          display: flex;
          gap: 11px;
          margin-top: 26px;
        }

        .accountant-logout-action {
          flex: 1;
          min-height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: 0.2s;
        }

        .accountant-logout-stay {
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #475569;
        }

        .accountant-logout-stay:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .accountant-logout-danger {
          border: 1px solid #ef4444;
          background: #ef4444;
          color: #fff;
        }

        .accountant-logout-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(239, 68, 68, 0.2);
        }

        @keyframes accountantLogoutFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes accountantLogoutIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .accountant-logout-modal {
            max-width: 100%;
            padding: 26px 20px 22px;
            border-radius: 17px;
          }

          .accountant-logout-modal h3 {
            font-size: 19px;
          }

          .accountant-logout-actions {
            gap: 8px;
          }

          .accountant-logout-action {
            min-height: 43px;
            font-size: 12px;
          }
        }
      `}</style>

      {sidebarOpen && (
        <div
          className="accountant-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
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

          {/* ĐỔI MẬT KHẨU */}
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

          {/* ĐĂNG XUẤT */}
          <button
            type="button"
            className="accountant-logout"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
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

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm && (
        <div
          className="accountant-logout-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            className="accountant-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accountant-logout-title"
          >
            <button
              type="button"
              className="accountant-logout-close"
              onClick={() => setShowLogoutConfirm(false)}
              aria-label="Đóng"
            >
              <X size={19} />
            </button>

            <div className="accountant-logout-icon">
              <ShieldAlert size={32} />
            </div>

            <h3 id="accountant-logout-title">
              Xác nhận đăng xuất
            </h3>

            <p>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống
              không? Phiên làm việc hiện tại của bạn sẽ kết thúc.
            </p>

            <div className="accountant-logout-actions">
              <button
                type="button"
                className="accountant-logout-action accountant-logout-stay"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Ở lại
              </button>

              <button
                type="button"
                className="accountant-logout-action accountant-logout-danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

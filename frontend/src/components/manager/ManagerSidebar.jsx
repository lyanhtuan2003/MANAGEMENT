
import { useState } from "react";

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
  UserRound,
  ShieldAlert,
} from "lucide-react";

// ========================================
// MENU QUẢN LÝ
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
    id: "finance",
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const role = String(user?.role || "").trim().toLowerCase();
  const isAccountant = role === "accountant";

  const managerName =
    user?.name ||
    user?.fullName ||
    (isAccountant ? "Kế toán" : "Quản trị viên");

  const avatar = String(managerName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // ========================================
  // CHUYỂN MENU
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
  // ĐĂNG XUẤT
  // Không dùng window.confirm()
  // ========================================

  const handleConfirmLogout = () => {
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
      "userRole",
    ].forEach((key) => localStorage.removeItem(key));

    window.location.href = "/login";
  };

  return (
    <>
      <style>{`
        .manager-logout-modal-overlay {
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
          animation: managerLogoutFade 0.2s ease;
        }

        .manager-logout-modal {
          position: relative;
          width: 100%;
          max-width: 410px;
          padding: 30px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
          text-align: center;
          animation: managerLogoutIn 0.25s ease;
        }

        .manager-logout-close {
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

        .manager-logout-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .manager-logout-icon {
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

        .manager-logout-modal h3 {
          margin: 0 0 9px;
          color: #1e293b;
          font-size: 21px;
          font-weight: 750;
        }

        .manager-logout-modal p {
          margin: 0 auto;
          max-width: 310px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .manager-logout-actions {
          display: flex;
          gap: 11px;
          margin-top: 26px;
        }

        .manager-logout-action {
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

        .manager-logout-stay {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
        }

        .manager-logout-stay:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .manager-logout-danger {
          border: 1px solid #ef4444;
          background: #ef4444;
          color: #ffffff;
        }

        .manager-logout-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(239, 68, 68, 0.2);
        }

        @keyframes managerLogoutFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes managerLogoutIn {
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
          .manager-logout-modal {
            max-width: 100%;
            padding: 26px 20px 22px;
            border-radius: 17px;
          }

          .manager-logout-modal h3 {
            font-size: 19px;
          }

          .manager-logout-actions {
            gap: 8px;
          }

          .manager-logout-action {
            min-height: 43px;
            font-size: 12px;
          }
        }
      `}</style>

      {/* OVERLAY MOBILE */}
      {open && (
        <div
          className="manager-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`manager-sidebar ${open ? "show" : ""}`}>
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

        <div className="sidebar-section">QUẢN LÝ</div>

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

          {isAccountant && (
            <button
              type="button"
              className={`manager-nav-item ${
                activeTab === "my-payroll" ? "active" : ""
              }`}
              onClick={() => handleNavigate("my-payroll")}
            >
              <UserRound size={19} />
              <span>Bảng lương của tôi</span>
            </button>
          )}
        </nav>

        {/* TÀI KHOẢN */}
        <div className="sidebar-bottom">
          <div className="manager-profile-mini">
            <div className="avatar">
              {avatar || "S"}
            </div>

            <div className="profile-info">
              <strong>{managerName}</strong>
              <span>
                {isAccountant ? "Kế toán" : "Quản lý hệ thống"}
              </span>
            </div>
          </div>

          {/* ĐĂNG XUẤT */}
          <button
            type="button"
            className="manager-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            title="Đăng xuất tài khoản"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm && (
        <div
          className="manager-logout-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            className="manager-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-logout-title"
          >
            <button
              type="button"
              className="manager-logout-close"
              onClick={() => setShowLogoutConfirm(false)}
              aria-label="Đóng"
            >
              <X size={19} />
            </button>

            <div className="manager-logout-icon">
              <ShieldAlert size={32} />
            </div>

            <h3 id="manager-logout-title">
              Xác nhận đăng xuất
            </h3>

            <p>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống
              không? Phiên quản lý hiện tại của bạn sẽ kết thúc.
            </p>

            <div className="manager-logout-actions">
              <button
                type="button"
                className="manager-logout-action manager-logout-stay"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Ở lại
              </button>

              <button
                type="button"
                className="manager-logout-action manager-logout-danger"
                onClick={handleConfirmLogout}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

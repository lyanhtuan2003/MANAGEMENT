
import { useState } from "react";

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
  ShieldAlert,
} from "lucide-react";

// ========================================
// MENU DÙNG CHUNG CHO NHÂN VIÊN
// ========================================

const commonMenus = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "attendance", label: "Chấm công", icon: Clock },
  { id: "payroll", label: "Bảng lương", icon: Wallet },
  { id: "leave", label: "Xin nghỉ phép", icon: CalendarDays },
  { id: "projects", label: "Dự án của tôi", icon: BriefcaseBusiness },
  { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound },
];

// ========================================
// MENU DÀNH RIÊNG CHO KẾ TOÁN
// ========================================

const accountantMenus = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "finance", label: "Quản lý thu chi", icon: ArrowLeftRight },
  { id: "attendance", label: "Chấm công", icon: Clock },
  { id: "payroll", label: "Bảng lương", icon: Wallet },

  // MỤC MỚI: QUẢN LÝ BẢNG LƯƠNG TOÀN CÔNG TY
  { id: "manage-payroll", label: "Quản lý bảng lương", icon: Wallet },

  { id: "leave", label: "Xin nghỉ phép", icon: CalendarDays },
  { id: "projects", label: "Dự án của tôi", icon: BriefcaseBusiness },
  { id: "profile", label: "Hồ sơ cá nhân", icon: UserRound },
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ========================================
  // XÁC ĐỊNH VAI TRÒ
  // ========================================

  const currentRole = String(
    role ||
      user?.role ||
      localStorage.getItem("userRole") ||
      "employee"
  )
    .trim()
    .toLowerCase();

  const isAccountant = currentRole === "accountant";

  // Chỉ kế toán có thêm menu quản lý thu chi và bảng lương
  const menus = isAccountant ? accountantMenus : commonMenus;

  // ========================================
  // THÔNG TIN NGƯỜI DÙNG
  // ========================================

  const employeeName =
    user?.name ||
    user?.fullName ||
    (isAccountant ? "Kế toán" : "Nhân viên");

  const employeeCode =
    user?.employeeCode ||
    (isAccountant ? "Kế toán" : "Tài khoản nhân viên");

  const avatar = String(employeeName)
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
    // Chỉ kế toán được sử dụng quản lý thu chi
    if (page === "finance" && !isAccountant) {
      return;
    }

    // Chỉ kế toán được quản lý bảng lương toàn công ty
    if (page === "manage-payroll" && !isAccountant) {
      return;
    }

    setActivePage(page);
    setOpen(false);
  };

  // ========================================
  // XÁC NHẬN ĐĂNG XUẤT
  // ========================================

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);

    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  return (
    <>
      <style>{`
        .logout-confirm-overlay {
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
          animation: logoutFadeIn 0.2s ease;
        }

        .logout-confirm-modal {
          position: relative;
          width: 100%;
          max-width: 410px;
          padding: 30px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
          text-align: center;
          animation: logoutModalIn 0.25s ease;
        }

        .logout-confirm-close {
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
          transition: 0.2s;
        }

        .logout-confirm-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .logout-confirm-icon {
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

        .logout-confirm-modal h3 {
          margin: 0 0 9px;
          color: #1e293b;
          font-size: 21px;
          font-weight: 750;
        }

        .logout-confirm-modal p {
          margin: 0 auto;
          max-width: 310px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .logout-confirm-actions {
          display: flex;
          gap: 11px;
          margin-top: 26px;
        }

        .logout-confirm-btn {
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

        .logout-stay-btn {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
        }

        .logout-stay-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .logout-confirm-btn-danger {
          border: 1px solid #ef4444;
          background: #ef4444;
          color: #ffffff;
        }

        .logout-confirm-btn-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(239, 68, 68, 0.2);
        }

        @keyframes logoutFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes logoutModalIn {
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
          .logout-confirm-modal {
            max-width: 100%;
            padding: 26px 20px 22px;
            border-radius: 17px;
          }

          .logout-confirm-modal h3 {
            font-size: 19px;
          }

          .logout-confirm-actions {
            gap: 8px;
          }

          .logout-confirm-btn {
            min-height: 43px;
            font-size: 12px;
          }
        }
      `}</style>

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
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MODAL XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm && (
        <div
          className="logout-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            className="logout-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <button
              type="button"
              className="logout-confirm-close"
              onClick={() => setShowLogoutConfirm(false)}
              aria-label="Đóng"
            >
              <X size={19} />
            </button>

            <div className="logout-confirm-icon">
              <ShieldAlert size={32} />
            </div>

            <h3 id="logout-confirm-title">
              Xác nhận đăng xuất
            </h3>

            <p>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống
              không? Phiên làm việc hiện tại của bạn sẽ kết thúc.
            </p>

            <div className="logout-confirm-actions">
              <button
                type="button"
                className="logout-confirm-btn logout-stay-btn"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Ở lại
              </button>

              <button
                type="button"
                className="logout-confirm-btn logout-confirm-btn-danger"
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

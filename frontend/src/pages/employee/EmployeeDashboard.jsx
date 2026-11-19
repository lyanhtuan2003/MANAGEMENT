
import { useState, useCallback, useMemo } from "react";

import EmployeeSidebar from "../../components/employee/EmployeeSidebar";
import EmployeeHeader from "../../components/employee/EmployeeHeader";

import EmployeeOverview from "../../components/employee/EmployeeOverview";
import Attendance from "../../components/employee/Attendance";
import Payroll from "../../components/employee/Payroll";
import LeaveRequest from "../../components/employee/LeaveRequest";
import MyProjects from "../../components/employee/MyProjects";
import MyProfile from "../../components/employee/MyProfile";
import ChangePassword from "../../components/employee/ChangePassword";

// Trang quản lý thu chi dành riêng cho kế toán
import AccountantCompanyFinance from "../../components/accountant/AccountantCompanyFinance";

import "./EmployeeDashboard.css";

// ========================================
// TIÊU ĐỀ CÁC TRANG
// ========================================

const pageTitles = {
  overview: "Tổng quan",
  finance: "Quản lý thu chi",
  attendance: "Chấm công",
  payroll: "Bảng lương",
  leave: "Xin nghỉ phép",
  projects: "Dự án của tôi",
  profile: "Hồ sơ cá nhân",
  changePassword: "Đổi mật khẩu",
};

// ========================================
// LẤY THÔNG TIN NGƯỜI DÙNG
// ========================================

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Không thể đọc thông tin người dùng:", error);
    return {};
  }
};

// ========================================
// LẤY VAI TRÒ
// ========================================

const getStoredRole = () => {
  const user = getStoredUser();

  return (
    localStorage.getItem("userRole") ||
    user?.role ||
    "employee"
  );
};

// ========================================
// EMPLOYEE / ACCOUNTANT DASHBOARD
// ========================================

export default function EmployeeDashboard({
  onLogout,
  role: roleProp,
}) {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);

  const role = roleProp || getStoredRole();
  const isAccountant = role === "accountant";

  const mustChangePassword = Boolean(user?.mustChangePassword);

  // ========================================
  // ĐĂNG XUẤT
  // ========================================

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
    ].forEach((key) => {
      localStorage.removeItem(key);
    });

    window.location.href = "/login";
  }, [onLogout]);

  // ========================================
  // CẬP NHẬT SAU KHI ĐỔI MẬT KHẨU
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
  // CHUYỂN TRANG
  // ========================================

  const handleChangePage = useCallback(
    (page) => {
      // Nhân viên không được mở trang thu chi
      if (page === "finance" && role !== "accountant") {
        return;
      }

      setActivePage(page);
      setSidebarOpen(false);
    },
    [role]
  );

  // ========================================
  // MỞ DỰ ÁN TỪ THÔNG BÁO
  // ========================================

  const handleOpenProjects = useCallback(() => {
    handleChangePage("projects");
  }, [handleChangePage]);

  // ========================================
  // TIÊU ĐỀ THEO VAI TRÒ
  // ========================================

  const currentTitle = useMemo(() => {
    return pageTitles[activePage] || "Tổng quan";
  }, [activePage]);

  // ========================================
  // HIỂN THỊ TỪNG TRANG
  // ========================================

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <EmployeeOverview
            setActivePage={handleChangePage}
          />
        );

      case "finance":
        if (!isAccountant) {
          return (
            <EmployeeOverview
              setActivePage={handleChangePage}
            />
          );
        }

        return <AccountantCompanyFinance />;

      case "attendance":
        return <Attendance />;

      case "payroll":
        return <Payroll />;

      case "leave":
        return <LeaveRequest />;

      case "projects":
        return <MyProjects />;

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
        return (
          <EmployeeOverview
            setActivePage={handleChangePage}
          />
        );
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
  // GIAO DIỆN CHÍNH
  // ========================================

  return (
    <div className="employee-app">

      <EmployeeSidebar
        activePage={activePage}
        setActivePage={handleChangePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onLogout={handleLogout}
        user={user}
        role={role}
      />

      <main className="employee-main">

        <EmployeeHeader
          setOpen={setSidebarOpen}
          title={currentTitle}
          user={user}
          onOpenProjects={handleOpenProjects}
        />

        <div className="employee-content">
          {renderPage()}
        </div>

        <footer className="employee-footer">
          <span>
            © 2026 Internal Management. All rights reserved.
          </span>
        </footer>

      </main>
    </div>
  );
}

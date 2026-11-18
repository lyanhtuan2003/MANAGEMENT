
import { useState, useCallback } from "react";

import EmployeeSidebar from "../../components/employee/EmployeeSidebar";
import EmployeeHeader from "../../components/employee/EmployeeHeader";

import EmployeeOverview from "../../components/employee/EmployeeOverview";
import Attendance from "../../components/employee/Attendance";
import Payroll from "../../components/employee/Payroll";
import LeaveRequest from "../../components/employee/LeaveRequest";
import MyProjects from "../../components/employee/MyProjects";
import MyProfile from "../../components/employee/MyProfile";
import ChangePassword from "../../components/employee/ChangePassword";

import "./EmployeeDashboard.css";

// ========================================
// TIÊU ĐỀ CÁC TRANG
// ========================================
const pageTitles = {
  overview: "Tổng quan",
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
// EMPLOYEE DASHBOARD
// ========================================
export default function EmployeeDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);

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

    window.location.reload();
  }, [onLogout]);

  // ========================================
  // CẬP NHẬT THÔNG TIN SAU KHI ĐỔI MẬT KHẨU
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
  const handleChangePage = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  // ========================================
  // MỞ TRANG DỰ ÁN TỪ THÔNG BÁO
  // ========================================
  const handleOpenProjects = useCallback(() => {
    handleChangePage("projects");
  }, [handleChangePage]);

  // ========================================
  // HIỂN THỊ NỘI DUNG TỪNG TRANG
  // ========================================
  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <EmployeeOverview
            setActivePage={handleChangePage}
          />
        );

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
  // BẮT BUỘC ĐỔI MẬT KHẨU KHI ĐĂNG NHẬP
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
      {/* SIDEBAR */}
      <EmployeeSidebar
        activePage={activePage}
        setActivePage={handleChangePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onLogout={handleLogout}
        user={user}
      />

      {/* MAIN CONTENT */}
      <main className="employee-main">
        {/* HEADER VÀ THÔNG BÁO */}
        <EmployeeHeader
          setOpen={setSidebarOpen}
          title={pageTitles[activePage] || "Tổng quan"}
          user={user}
          onOpenProjects={handleOpenProjects}
        />

        {/* NỘI DUNG TRANG */}
        <div className="employee-content">
          {renderPage()}
        </div>

        {/* FOOTER */}
        <footer className="employee-footer">
          <span>
            © 2026 Internal Management. All rights reserved.
          </span>
        </footer>
      </main>
    </div>
  );
}

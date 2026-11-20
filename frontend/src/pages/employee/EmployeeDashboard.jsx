import {
  useState,
  useCallback,
  useMemo,
} from "react";

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

// Trang quản lý bảng lương toàn công ty
import ManagerPayroll from "../../components/manager/ManagerPayroll";

import "./EmployeeDashboard.css";

// ========================================
// TIÊU ĐỀ CÁC TRANG
// ========================================

const pageTitles = {
  overview: "Tổng quan",
  finance: "Quản lý thu chi",
  attendance: "Chấm công",
  payroll: "Bảng lương cá nhân",
  "manage-payroll": "Quản lý bảng lương nhân viên",
  leave: "Xin nghỉ phép",
  projects: "Dự án của tôi",
  profile: "Hồ sơ cá nhân",
  changePassword: "Đổi mật khẩu",
};

// ========================================
// CHUẨN HÓA TEXT
// ========================================

const safeText = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (typeof value === "object") {
    if (typeof value.name === "string") return value.name;
    if (typeof value.fullName === "string") {
      return value.fullName;
    }
  }

  return fallback;
};

// ========================================
// LẤY THÔNG TIN NGƯỜI DÙNG
// ========================================

const getStoredUser = () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (
      !user ||
      typeof user !== "object" ||
      Array.isArray(user)
    ) {
      return {};
    }

    return user;
  } catch (error) {
    console.error(
      "Không thể đọc thông tin người dùng:",
      error
    );

    return {};
  }
};

// ========================================
// LẤY VAI TRÒ
// ========================================

const getStoredRole = () => {
  const user = getStoredUser();

  return safeText(
    localStorage.getItem("userRole") || user?.role,
    "employee"
  )
    .trim()
    .toLowerCase();
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

  const role = safeText(
    roleProp || getStoredRole(),
    "employee"
  )
    .trim()
    .toLowerCase();

  const isAccountant = role === "accountant";

  const mustChangePassword = Boolean(
    user?.mustChangePassword
  );

  // ========================================
  // ĐĂNG XUẤT
  // ========================================

const handleLogout = useCallback(() => {
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
}, []);

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

      localStorage.setItem(
        "user",
        JSON.stringify(nextUser)
      );

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

      // Chỉ kế toán được quản lý bảng lương công ty
      if (
        page === "manage-payroll" &&
        role !== "accountant"
      ) {
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
      // TỔNG QUAN
      case "overview":
        return (
          <EmployeeOverview
            setActivePage={handleChangePage}
          />
        );

      // QUẢN LÝ THU CHI - CHỈ KẾ TOÁN
      case "finance":
        if (!isAccountant) {
          return (
            <EmployeeOverview
              setActivePage={handleChangePage}
            />
          );
        }

        return <AccountantCompanyFinance />;

      // CHẤM CÔNG
      case "attendance":
        return <Attendance />;

      // BẢNG LƯƠNG CÁ NHÂN
      case "payroll":
        return <Payroll />;

      // QUẢN LÝ BẢNG LƯƠNG TOÀN CÔNG TY
      case "manage-payroll":
        if (!isAccountant) {
          return (
            <EmployeeOverview
              setActivePage={handleChangePage}
            />
          );
        }

        return <ManagerPayroll />;

      // XIN NGHỈ PHÉP
      case "leave":
        return <LeaveRequest />;

      // DỰ ÁN CỦA TÔI
      case "projects":
        return <MyProjects />;

      // HỒ SƠ CÁ NHÂN
      case "profile":
        return <MyProfile />;

      // ĐỔI MẬT KHẨU
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

import { useState, useCallback } from "react";

import Login from "./components/auth/Login";
import EmployeeSessionGuard from "./components/auth/EmployeeSessionGuard";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";

import "./App.css";

// ========================================
// CÁC VAI TRÒ HỢP LỆ
// ========================================

const VALID_ROLES = [
  "manager",
  "accountant",
  "employee",
];

// ========================================
// LẤY VAI TRÒ ĐÃ LƯU
// ========================================

const getStoredRole = () => {
  const savedRole = localStorage.getItem("userRole") || "";

  return VALID_ROLES.includes(savedRole)
    ? savedRole
    : "";
};

// ========================================
// XÓA THÔNG TIN ĐĂNG NHẬP
// ========================================

const clearAuthData = () => {
  const keys = [
    "token",
    "authToken",
    "accessToken",
    "user",
    "currentUser",
    "authUser",
    "userRole",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

// ========================================
// APP
// ========================================

function App() {
  const [role, setRole] = useState(getStoredRole);

  // ========================================
  // ĐĂNG NHẬP
  // ========================================

  const handleLogin = useCallback((selectedRole, user) => {
    if (!VALID_ROLES.includes(selectedRole)) {
      console.error(
        "Vai trò đăng nhập không hợp lệ:",
        selectedRole
      );
      return;
    }

    localStorage.setItem("userRole", selectedRole);

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    setRole(selectedRole);
  }, []);

  // ========================================
  // ĐĂNG XUẤT
  // KHÔNG SỬ DỤNG window.confirm()
  // Modal xác nhận được xử lý tại Sidebar
  // ========================================

  const handleLogout = useCallback(() => {
    clearAuthData();
    setRole("");
  }, []);

  // ========================================
  // PHIÊN HẾT HẠN
  // ========================================

  const handleSessionExpired = useCallback(() => {
    clearAuthData();
    setRole("");
  }, []);

  // ========================================
  // KIỂM TRA VAI TRÒ
  // ========================================

  const isValidRole = VALID_ROLES.includes(role);

  // ========================================
  // CHƯA ĐĂNG NHẬP
  // ========================================

  if (!isValidRole) {
    return <Login onLogin={handleLogin} />;
  }

  // ========================================
  // ĐÃ ĐĂNG NHẬP
  // ========================================

  return (
    <div className="authenticated-app">

      <EmployeeSessionGuard
        role={role}
        onLogout={handleSessionExpired}
      />

      {/* QUẢN LÝ */}
      {role === "manager" && (
        <ManagerDashboard
          onLogout={handleLogout}
        />
      )}

      {/* NHÂN VIÊN VÀ KẾ TOÁN */}
      {(role === "employee" || role === "accountant") && (
        <EmployeeDashboard
          role={role}
          onLogout={handleLogout}
        />
      )}

    </div>
  );
}

export default App;

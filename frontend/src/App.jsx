
import { useState, useCallback } from "react";

import Login from "./components/auth/Login";
import EmployeeSessionGuard from "./components/auth/EmployeeSessionGuard";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";

import "./App.css";

function App() {
  const [role, setRole] = useState(
    () => localStorage.getItem("userRole") || ""
  );

  // ĐĂNG NHẬP
  const handleLogin = useCallback((selectedRole) => {
    if (!["manager", "employee"].includes(selectedRole)) {
      return;
    }

    localStorage.setItem("userRole", selectedRole);
    setRole(selectedRole);
  }, []);

  // ĐĂNG XUẤT CHUNG CHO TOÀN HỆ THỐNG
  const handleLogout = useCallback(() => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
    );

    if (!confirmed) return;

    const keys = [
      "token",
      "authToken",
      "accessToken",
      "user",
      "userRole",
    ];

    keys.forEach((key) => localStorage.removeItem(key));

    setRole("");
  }, []);

  const isValidRole = ["manager", "employee"].includes(role);

  if (!isValidRole) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="authenticated-app">
      <EmployeeSessionGuard
        role={role}
        onLogout={() => {
          // Tài khoản bị khóa hoặc phiên không còn hợp lệ:
          // đăng xuất ngay, không cần xác nhận.
          [
            "token",
            "authToken",
            "accessToken",
            "user",
            "userRole",
          ].forEach((key) => localStorage.removeItem(key));

          setRole("");
        }}
      />

      {role === "manager" && (
        <ManagerDashboard onLogout={handleLogout} />
      )}

      {role === "employee" && (
        <EmployeeDashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

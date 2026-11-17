
import { useState } from "react";
import { LogOut } from "lucide-react";

import Login from "./components/auth/Login";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";

import "./App.css";

function App() {
  const [role, setRole] = useState(
    () => localStorage.getItem("userRole") || ""
  );

  const handleLogin = (selectedRole) => {
    localStorage.setItem("userRole", selectedRole);
    setRole(selectedRole);
  };

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    setRole("");
  };

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="authenticated-app">
      {role === "manager" ? (
        <ManagerDashboard />
      ) : role === "employee" ? (
        <EmployeeDashboard />
      ) : (
        <Login onLogin={handleLogin} />
      )}

      <button
        className="global-logout"
        onClick={handleLogout}
        title="Đăng xuất"
      >
        <LogOut size={17} />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
}

export default App;

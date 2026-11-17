import { useState } from "react";

import EmployeeSidebar from "../../components/employee/EmployeeSidebar";
import EmployeeHeader from "../../components/employee/EmployeeHeader";

import EmployeeOverview from "../../components/employee/EmployeeOverview";
import Attendance from "../../components/employee/Attendance";
import Payroll from "../../components/employee/Payroll";
import LeaveRequest from "../../components/employee/LeaveRequest";
import MyProjects from "../../components/employee/MyProjects";
import MyProfile from "../../components/employee/MyProfile";

import "./EmployeeDashboard.css";

const pageTitles = {
  overview: "Tổng quan",
  attendance: "Chấm công",
  payroll: "Bảng lương",
  leave: "Xin nghỉ phép",
  projects: "Dự án của tôi",
  profile: "Hồ sơ cá nhân",
};

export default function EmployeeDashboard() {
  const [activePage, setActivePage] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [checkedIn, setCheckedIn] = useState("");
  const [checkedOut, setCheckedOut] = useState("");

  const getTime = () => {
    return new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const checkIn = () => {
    if (checkedIn) return;

    setCheckedIn(getTime());
  };

  const checkOut = () => {
    if (!checkedIn || checkedOut) return;

    setCheckedOut(getTime());
  };

  const handleLogout = () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất?");

    if (confirmed) {
      alert("Chức năng đăng xuất sẽ được kết nối khi xây dựng hệ thống đăng nhập.");
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <EmployeeOverview
            setActivePage={setActivePage}
            checkIn={checkIn}
            checkOut={checkOut}
            checkedIn={checkedIn}
            checkedOut={checkedOut}
          />
        );

      case "attendance":
        return (
          <Attendance
            checkIn={checkIn}
            checkOut={checkOut}
            checkedIn={checkedIn}
            checkedOut={checkedOut}
          />
        );

      case "payroll":
        return <Payroll />;

      case "leave":
        return <LeaveRequest />;

      case "projects":
        return <MyProjects />;

      case "profile":
        return <MyProfile />;

      default:
        return <EmployeeOverview setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="employee-app">
      <EmployeeSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      <main className="employee-main">
        <EmployeeHeader
          setOpen={setSidebarOpen}
          title={pageTitles[activePage]}
        />

        {renderPage()}

        <footer className="employee-footer">
          © 2026 Internal Management. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
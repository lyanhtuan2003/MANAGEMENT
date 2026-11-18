
import { useState, useEffect, useCallback } from "react";

import ManagerSidebar from "../../components/manager/ManagerSidebar";
import ManagerHeader from "../../components/manager/ManagerHeader";
import ManagerStats from "../../components/manager/ManagerStats";
import ManagerEmployees from "../../components/manager/ManagerEmployees";
import ManagerLeaveRequests from "../../components/manager/ManagerLeaveRequests";
import ManagerProjects from "../../components/manager/ManagerProjects";
import ManagerRewards from "../../components/manager/ManagerRewards";
import ManagerAttendance from "../../components/manager/ManagerAttendance";
import ManagerPayroll from "../../components/manager/ManagerPayroll";

import { initialProjects } from "../../data/managerData";

import "./manager.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const NOTIFICATION_KEY = "manager_notifications";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const readStorage = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

export default function ManagerDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [open, setOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");

  const [requests, setRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const [projects, setProjects] = useState(initialProjects);

  const [notifications, setNotifications] = useState(() =>
    readStorage(NOTIFICATION_KEY, [])
  );

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError("");

      const token = getToken();

      if (!token) throw new Error("Không tìm thấy token đăng nhập.");

      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tải nhân viên.");
      }

      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (error) {
      console.error(error);
      setEmployeesError(error.message);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLeaveLoading(true);
      setLeaveError("");

      const token = getToken();

      if (!token) throw new Error("Không tìm thấy token đăng nhập.");

      const response = await fetch(`${API_BASE_URL}/leave/manager`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Không thể tải đơn nghỉ phép.");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (error) {
      console.error(error);
      setLeaveError(error.message);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchLeaveRequests();
  }, [fetchEmployees, fetchLeaveRequests]);

  const syncNotifications = useCallback(() => {
    setNotifications(readStorage(NOTIFICATION_KEY, []));
  }, []);

  useEffect(() => {
    const handleUpdate = () => syncNotifications();

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("manager-notifications-updated", handleUpdate);
    window.addEventListener("manager-attendance-updated", handleUpdate);

    syncNotifications();

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("manager-notifications-updated", handleUpdate);
      window.removeEventListener("manager-attendance-updated", handleUpdate);
    };
  }, [syncNotifications]);

  const saveNotifications = useCallback((updated) => {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));
    setNotifications(updated);
    window.dispatchEvent(new Event("manager-notifications-updated"));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    saveNotifications(
      notifications.map((item) => ({ ...item, read: true }))
    );
  }, [notifications, saveNotifications]);

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification) return;

      saveNotifications(
        notifications.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );

      switch (notification.type) {
        case "leave_request":
          setActiveTab("leaves");
          fetchLeaveRequests();
          break;

        case "attendance":
        case "attendance_update":
          setActiveTab("attendance");
          break;

        default:
          break;
      }
    },
    [notifications, saveNotifications, fetchLeaveRequests]
  );

  const handleLogout = useCallback(() => {
    if (typeof onLogout === "function") onLogout();
  }, [onLogout]);

  const pendingRequests = requests.filter(
    (request) =>
      request.status === "pending" ||
      request.status === "Chờ duyệt"
  );

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const titles = {
    overview: "Tổng quan hệ thống",
    employees: "Quản lý nhân viên",
    attendance: "Quản lý chấm công",
    payroll: "Quản lý bảng lương",
    leaves: "Quản lý đơn nghỉ phép",
    projects: "Quản lý dự án",
    rewards: "Quản lý thưởng và phạt",
  };

  return (
    <div className="manager-layout">
      <ManagerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        open={open}
        setOpen={setOpen}
        onLogout={handleLogout}
      />

      <main className="manager-main">
        <ManagerHeader
          setOpen={setOpen}
          notifications={notifications}
          onMarkAllRead={markAllNotificationsRead}
          onNotificationClick={handleNotificationClick}
        />

        <div className="manager-content">

          {activeTab === "overview" && (
            <>
              <ManagerStats />

              <div className="overview-grid">
                <div className="manager-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Đơn nghỉ chờ duyệt</h2>
                      <p>Các yêu cầu cần được xử lý</p>
                    </div>

                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setActiveTab("leaves");
                        fetchLeaveRequests();
                      }}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {leaveLoading ? (
                    <div className="empty-state">Đang tải đơn nghỉ phép...</div>
                  ) : leaveError ? (
                    <div className="empty-state">{leaveError}</div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="empty-state">Không có đơn chờ duyệt</div>
                  ) : (
                    pendingRequests.slice(0, 4).map((request) => (
                      <div
                        className="overview-leave"
                        key={request._id || request.id}
                      >
                        <div className="avatar">
                          {(request.employeeName || request.employee || "N").charAt(0)}
                        </div>

                        <div className="overview-leave-info">
                          <strong>
                            {request.employeeName || request.employee || "Nhân viên"}
                          </strong>
                          <span>
                            {request.type} · {formatDate(request.from)}
                          </span>
                        </div>

                        <span className="status-badge pending">Chờ duyệt</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="manager-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Tiến độ dự án</h2>
                      <p>Tình hình các dự án hiện tại</p>
                    </div>

                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => setActiveTab("projects")}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {projects.slice(0, 4).map((project) => (
                    <div className="overview-project" key={project.id}>
                      <div className="overview-project-heading">
                        <strong>{project.name}</strong>
                        <span>{project.progress}%</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="manager-panel">
                {employeesLoading && (
                  <p className="manager-data-message">
                    Đang tải danh sách nhân viên...
                  </p>
                )}

                {employeesError && (
                  <p className="manager-data-error">{employeesError}</p>
                )}

                <div className="panel-heading">
                  <div>
                    <h2>Nhân viên mới nhất</h2>
                    <p>Danh sách nhân sự trong hệ thống</p>
                  </div>

                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => setActiveTab("employees")}
                  >
                    Quản lý nhân viên
                  </button>
                </div>

                <div className="responsive-table">
                  <table className="manager-table">
                    <thead>
                      <tr>
                        <th>Nhân viên</th>
                        <th>Phòng ban</th>
                        <th>Chức vụ</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="empty-state">
                            Chưa có dữ liệu nhân viên
                          </td>
                        </tr>
                      ) : (
                        employees.slice(0, 4).map((emp) => (
                          <tr key={emp._id || emp.id}>
                            <td>
                              <div className="employee-cell">
                                <div className="avatar">
                                  {(emp.name || "N").charAt(0)}
                                </div>
                                <div>
                                  <strong>{emp.name}</strong>
                                  <small>{emp.employeeCode || "Chưa có mã"}</small>
                                </div>
                              </div>
                            </td>

                            <td>{emp.department || "Chưa cập nhật"}</td>
                            <td>{emp.position || "Chưa cập nhật"}</td>

                            <td>
                              <span
                                className={`status-badge ${
                                  emp.status === "working"
                                    ? "approved"
                                    : emp.status === "probation"
                                      ? "pending"
                                      : "rejected"
                                }`}
                              >
                                {{
                                  working: "Đang làm việc",
                                  probation: "Thử việc",
                                  resigned: "Đã nghỉ việc",
                                }[emp.status] || emp.status || "Chưa xác định"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "employees" && (
            <ManagerEmployees
              employees={employees}
              setEmployees={setEmployees}
              onRefresh={fetchEmployees}
              employeesLoading={employeesLoading}
              employeesError={employeesError}
            />
          )}

          {activeTab === "attendance" && (
            <ManagerAttendance employees={employees} />
          )}

          {activeTab === "payroll" && <ManagerPayroll />}

          {activeTab === "leaves" && (
            <ManagerLeaveRequests
              requests={requests}
              onRefresh={fetchLeaveRequests}
              loading={leaveLoading}
              error={leaveError}
            />
          )}

          {activeTab === "projects" && (
            <ManagerProjects
              projects={projects}
              setProjects={setProjects}
            />
          )}

          {activeTab === "rewards" && (
            <ManagerRewards employees={employees} />
          )}
        </div>
      </main>
    </div>
  );
}

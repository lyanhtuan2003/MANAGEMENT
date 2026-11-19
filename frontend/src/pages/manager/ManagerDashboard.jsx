
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
import ManagerCompanyFinance from "../../components/manager/ManagerCompanyFinance";

import { initialProjects } from "../../data/managerData";

import "./manager.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

const NOTIFICATION_KEY = "manager_notifications";

// ========================================
// TOKEN
// ========================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

// ========================================
// LOCAL STORAGE
// ========================================

const readStorage = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

// ========================================
// FORMAT DATE
// ========================================

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

// ========================================
// MANAGER DASHBOARD
// ========================================

export default function ManagerDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [open, setOpen] = useState(false);

  // ======================================
  // NHÂN VIÊN
  // ======================================

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");

  // ======================================
  // ĐƠN NGHỈ PHÉP
  // ======================================

  const [requests, setRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  // ======================================
  // DỰ ÁN
  // ======================================

  const [projects, setProjects] = useState(initialProjects);

  // ======================================
  // THÔNG BÁO
  // ======================================

  const [notifications, setNotifications] = useState(() =>
    readStorage(NOTIFICATION_KEY, [])
  );

  // ======================================
  // ĐỔI TAB
  // HỖ TRỢ CẢ finance VÀ company-finance
  // ======================================

  const handleChangeTab = useCallback((tab) => {
    const normalizedTab =
      tab === "finance" ? "company-finance" : tab;

    setActiveTab(normalizedTab);
    setOpen(false);
  }, []);

  // ======================================
  // API: LẤY DANH SÁCH NHÂN VIÊN
  // ======================================

  const fetchEmployees = useCallback(async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError("");

      const token = getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập.");
      }

      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải danh sách nhân viên."
        );
      }

      setEmployees(
        Array.isArray(data.employees)
          ? data.employees
          : Array.isArray(data.data)
            ? data.data
            : []
      );
    } catch (error) {
      console.error("Lỗi tải nhân viên:", error);
      setEmployeesError(error.message);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // ======================================
  // API: LẤY ĐƠN NGHỈ PHÉP
  // ======================================

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLeaveLoading(true);
      setLeaveError("");

      const token = getToken();

      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập.");
      }

      const response = await fetch(`${API_BASE_URL}/leave/manager`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải đơn nghỉ phép."
        );
      }

      setRequests(
        Array.isArray(data.requests)
          ? data.requests
          : Array.isArray(data.data)
            ? data.data
            : []
      );
    } catch (error) {
      console.error("Lỗi tải đơn nghỉ phép:", error);
      setLeaveError(error.message);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  // ======================================
  // LOAD DATA
  // ======================================

  useEffect(() => {
    fetchEmployees();
    fetchLeaveRequests();
  }, [fetchEmployees, fetchLeaveRequests]);

  // ======================================
  // ĐỒNG BỘ THÔNG BÁO
  // ======================================

  const syncNotifications = useCallback(() => {
    setNotifications(readStorage(NOTIFICATION_KEY, []));
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      syncNotifications();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener(
      "manager-notifications-updated",
      handleUpdate
    );
    window.addEventListener(
      "manager-attendance-updated",
      handleUpdate
    );

    syncNotifications();

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(
        "manager-notifications-updated",
        handleUpdate
      );
      window.removeEventListener(
        "manager-attendance-updated",
        handleUpdate
      );
    };
  }, [syncNotifications]);

  // ======================================
  // LƯU THÔNG BÁO
  // ======================================

  const saveNotifications = useCallback((updated) => {
    localStorage.setItem(
      NOTIFICATION_KEY,
      JSON.stringify(updated)
    );

    setNotifications(updated);

    window.dispatchEvent(
      new Event("manager-notifications-updated")
    );
  }, []);

  // ======================================
  // ĐÁNH DẤU TẤT CẢ ĐÃ ĐỌC
  // ======================================

  const markAllNotificationsRead = useCallback(() => {
    saveNotifications(
      notifications.map((item) => ({
        ...item,
        read: true,
      }))
    );
  }, [notifications, saveNotifications]);

  // ======================================
  // CLICK THÔNG BÁO
  // ======================================

  const handleNotificationClick = useCallback(
    (notification) => {
      if (!notification) return;

      saveNotifications(
        notifications.map((item) =>
          item.id === notification.id
            ? { ...item, read: true }
            : item
        )
      );

      switch (notification.type) {
        case "leave_request":
          handleChangeTab("leaves");
          fetchLeaveRequests();
          break;

        case "attendance":
        case "attendance_update":
          handleChangeTab("attendance");
          break;

        case "company-finance":
        case "finance":
          handleChangeTab("company-finance");
          break;

        default:
          break;
      }
    },
    [
      notifications,
      saveNotifications,
      fetchLeaveRequests,
      handleChangeTab,
    ]
  );

  // ======================================
  // ĐĂNG XUẤT
  // ======================================

  const handleLogout = useCallback(() => {
    if (typeof onLogout === "function") {
      onLogout();
    }
  }, [onLogout]);

  // ======================================
  // ĐƠN NGHỈ ĐANG CHỜ
  // ======================================

  const pendingRequests = requests.filter(
    (request) =>
      request.status === "pending" ||
      request.status === "Chờ duyệt"
  );

  // ======================================
  // TIÊU ĐỀ
  // ======================================

  const titles = {
    overview: "Tổng quan hệ thống",
    employees: "Quản lý nhân viên",
    attendance: "Quản lý chấm công",
    payroll: "Quản lý bảng lương",
    leaves: "Quản lý đơn nghỉ phép",
    projects: "Quản lý dự án",
    rewards: "Quản lý thưởng và phạt",
    "company-finance": "Quản lý thu chi công ty",
    finance: "Quản lý thu chi công ty",
  };

  // ======================================
  // GIAO DIỆN
  // ======================================

  return (
    <div className="manager-layout">
      <ManagerSidebar
        activeTab={activeTab}
        setActiveTab={handleChangeTab}
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
          {/* ==================================
              TỔNG QUAN
          ================================== */}

          {activeTab === "overview" && (
            <>
              <ManagerStats />

              <div className="overview-grid">
                {/* ĐƠN NGHỈ CHỜ DUYỆT */}

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
                        handleChangeTab("leaves");
                        fetchLeaveRequests();
                      }}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {leaveLoading ? (
                    <div className="empty-state">
                      Đang tải đơn nghỉ phép...
                    </div>
                  ) : leaveError ? (
                    <div className="empty-state">
                      {leaveError}
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="empty-state">
                      Không có đơn chờ duyệt
                    </div>
                  ) : (
                    pendingRequests.slice(0, 4).map((request) => (
                      <div
                        className="overview-leave"
                        key={request._id || request.id}
                      >
                        <div className="avatar">
                          {(
                            request.employeeName ||
                            request.employee ||
                            "N"
                          ).charAt(0)}
                        </div>

                        <div className="overview-leave-info">
                          <strong>
                            {request.employeeName ||
                              request.employee ||
                              "Nhân viên"}
                          </strong>

                          <span>
                            {request.type} ·{" "}
                            {formatDate(request.from)}
                          </span>
                        </div>

                        <span className="status-badge pending">
                          Chờ duyệt
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* TIẾN ĐỘ DỰ ÁN */}

                <div className="manager-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Tiến độ dự án</h2>
                      <p>Tình hình các dự án hiện tại</p>
                    </div>

                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => handleChangeTab("projects")}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {projects.slice(0, 4).map((project) => (
                    <div
                      className="overview-project"
                      key={project.id}
                    >
                      <div className="overview-project-heading">
                        <strong>{project.name}</strong>
                        <span>{project.progress}%</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${project.progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NHÂN VIÊN MỚI NHẤT */}

              <div className="manager-panel">
                {employeesLoading && (
                  <p className="manager-data-message">
                    Đang tải danh sách nhân viên...
                  </p>
                )}

                {employeesError && (
                  <p className="manager-data-error">
                    {employeesError}
                  </p>
                )}

                <div className="panel-heading">
                  <div>
                    <h2>Nhân viên mới nhất</h2>
                    <p>Danh sách nhân sự trong hệ thống</p>
                  </div>

                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => handleChangeTab("employees")}
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
                                  <small>
                                    {emp.employeeCode || "Chưa có mã"}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td>
                              {emp.department || "Chưa cập nhật"}
                            </td>

                            <td>
                              {emp.position || "Chưa cập nhật"}
                            </td>

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
                                }[emp.status] ||
                                  emp.status ||
                                  "Chưa xác định"}
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

          {/* ==================================
              QUẢN LÝ NHÂN VIÊN
          ================================== */}

          {activeTab === "employees" && (
            <ManagerEmployees
              employees={employees}
              setEmployees={setEmployees}
              onRefresh={fetchEmployees}
              employeesLoading={employeesLoading}
              employeesError={employeesError}
            />
          )}

          {/* ==================================
              CHẤM CÔNG
          ================================== */}

          {activeTab === "attendance" && (
            <ManagerAttendance employees={employees} />
          )}

          {/* ==================================
              BẢNG LƯƠNG
          ================================== */}

          {activeTab === "payroll" && <ManagerPayroll />}

          {/* ==================================
              DUYỆT NGHỈ PHÉP
          ================================== */}

          {activeTab === "leaves" && (
            <ManagerLeaveRequests
              requests={requests}
              onRefresh={fetchLeaveRequests}
              loading={leaveLoading}
              error={leaveError}
            />
          )}

          {/* ==================================
              DỰ ÁN
          ================================== */}

          {activeTab === "projects" && (
            <ManagerProjects
              projects={projects}
              setProjects={setProjects}
            />
          )}

          {/* ==================================
              THƯỞNG VÀ PHẠT
          ================================== */}

          {activeTab === "rewards" && (
            <ManagerRewards employees={employees} />
          )}

          {/* ==================================
              QUẢN LÝ THU CHI
              DÙNG CHUNG COMPONENT VỚI KẾ TOÁN
          ================================== */}

          {(activeTab === "company-finance" ||
            activeTab === "finance") && (
            <ManagerCompanyFinance />
          )}
        </div>
      </main>
    </div>
  );
}

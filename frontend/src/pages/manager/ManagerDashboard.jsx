
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import {
  Users,
  UserCheck,
  CalendarClock,
  FolderKanban,
  RefreshCw,
} from "lucide-react";

import ManagerSidebar from "../../components/manager/ManagerSidebar";
import ManagerHeader from "../../components/manager/ManagerHeader";
import ManagerEmployees from "../../components/manager/ManagerEmployees";
import ManagerLeaveRequests from "../../components/manager/ManagerLeaveRequests";
import ManagerProjects from "../../components/manager/ManagerProjects";
import ManagerRewards from "../../components/manager/ManagerRewards";
import ManagerCompanyFinance from "../../components/manager/ManagerCompanyFinance";
import ManagerAttendance from "../../components/manager/ManagerAttendance";
import ManagerPayroll from "../../components/manager/ManagerPayroll";

import "./manager.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

// ========================================
// TOKEN VÀ USER
// ========================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

// ========================================
// CHUẨN HÓA DỮ LIỆU
// ========================================

const getArray = (response, possibleKeys = []) => {
  if (Array.isArray(response)) return response;

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }

    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

// ========================================
// CHUẨN HÓA TAB
// ========================================

const normalizeTab = (tab) => {
  if (tab === "company-finance") return "finance";
  if (tab === "finance") return "finance";

  const allowedTabs = [
    "overview",
    "employees",
    "attendance",
    "payroll",
    "leaves",
    "projects",
    "rewards",
    "finance",
  ];

  return allowedTabs.includes(tab) ? tab : "overview";
};

// ========================================
// FORMAT
// ========================================

const getInitials = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "NV";

// ========================================
// TRẠNG THÁI NHÂN SỰ
// ========================================

const getStaffStatus = (employee) => {
  if (employee?.isActive === false) return "locked";

  const status = String(employee?.status || "").toLowerCase();

  if (
    ["resigned", "quit", "inactive", "đã nghỉ việc"].includes(status)
  ) {
    return "resigned";
  }

  if (
    ["probation", "trial", "thử việc"].includes(status)
  ) {
    return "probation";
  }

  return "working";
};

const isWorking = (employee) =>
  employee?.isActive !== false &&
  getStaffStatus(employee) === "working";

// ========================================
// TRẠNG THÁI ĐƠN NGHỈ
// ========================================

const isPending = (item) => {
  const status = String(item?.status || "").toLowerCase();

  return [
    "pending",
    "waiting",
    "chờ duyệt",
    "cho duyet",
  ].includes(status);
};

// ========================================
// TRẠNG THÁI DỰ ÁN
// ========================================

const isProjectActive = (project) => {
  const status = String(project?.status || "").toLowerCase();

  return ![
    "completed",
    "complete",
    "finished",
    "cancelled",
    "canceled",
    "done",
    "hoàn thành",
    "đã hoàn thành",
    "đã hủy",
  ].includes(status);
};

// ========================================
// THẺ THỐNG KÊ
// ========================================

function StatCard({ title, value, note, icon: Icon, color }) {
  return (
    <div className="manager-stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={23} />
      </div>

      <div className="stat-content">
        <span>{title}</span>
        <h2>{value}</h2>
        <small>{note}</small>
      </div>
    </div>
  );
}

// ========================================
// MANAGER DASHBOARD
// ========================================

export default function ManagerDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user] = useState(getStoredUser);

  // ======================================
  // DỮ LIỆU HỆ THỐNG
  // ======================================

  const [employees, setEmployees] = useState([]);
  const [accountants, setAccountants] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // ======================================
  // TRẠNG THÁI
  // ======================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ======================================
  // HÀM GỌI API
  // ======================================

  const apiRequest = useCallback(async (endpoint, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập.");
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    let result = {};

    try {
      result = await response.json();
    } catch {
      throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
    }

    if (response.status === 401) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    if (response.status === 403) {
      throw new Error("Bạn không có quyền thực hiện thao tác này.");
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Lỗi API: ${response.status}`
      );
    }

    return result;
  }, []);

  const apiGet = useCallback(
    (endpoint) => apiRequest(endpoint),
    [apiRequest]
  );

  // ======================================
  // TẢI NHÂN VIÊN VÀ KẾ TOÁN
  // ======================================

  const loadEmployees = useCallback(async () => {
    const [employeeResult, accountantResult] =
      await Promise.allSettled([
        apiGet("/employees"),
        apiGet("/accountants"),
      ]);

    if (employeeResult.status === "rejected") {
      throw employeeResult.reason;
    }

    const employeeList = getArray(
      employeeResult.value,
      ["employees", "users"]
    );

    let accountantList = [];

    if (accountantResult.status === "fulfilled") {
      accountantList = getArray(
        accountantResult.value,
        ["accountants", "users"]
      );
    } else {
      console.error(
        "Không tải được danh sách kế toán:",
        accountantResult.reason
      );
    }

    setEmployees(employeeList);
    setAccountants(accountantList);
  }, [apiGet]);

  // ======================================
  // TẢI ĐƠN NGHỈ PHÉP
  // ======================================

  const loadLeaveRequests = useCallback(async () => {
    const result = await apiGet("/leave/manager");

    const requests = getArray(result, [
      "requests",
      "leaves",
    ]);

    setLeaveRequests(requests);

    return requests;
  }, [apiGet]);

  // ======================================
  // TẢI DỰ ÁN
  // ======================================

  const loadProjects = useCallback(async () => {
    const result = await apiGet("/projects/manager");

    const projectList = getArray(result, ["projects"]);

    setProjects(projectList);

    return projectList;
  }, [apiGet]);

  // ======================================
  // TẢI THÔNG BÁO
  // ======================================

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiGet("/notifications/me");

      const notificationList = getArray(result, [
        "notifications",
      ]);

      setNotifications(notificationList);

      return notificationList;
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
      return [];
    }
  }, [apiGet]);

  // ======================================
  // ĐÁNH DẤU MỘT THÔNG BÁO ĐÃ ĐỌC
  // ======================================

  const handleNotificationClick = useCallback(
    async (item) => {
      const notificationId = item?._id || item?.id;

      if (!notificationId) return;

      const alreadyRead = item.isRead ?? item.read ?? false;

      try {
        if (!alreadyRead) {
          await apiRequest(
            `/notifications/${notificationId}/read`,
            {
              method: "PATCH",
            }
          );

          setNotifications((previous) =>
            previous.map((notification) =>
              (notification._id || notification.id) === notificationId
                ? {
                    ...notification,
                    isRead: true,
                    read: true,
                  }
                : notification
            )
          );
        }

        const notificationType = String(
          item.type || item.relatedType || ""
        ).toLowerCase();

        if (
          notificationType.includes("leave") ||
          notificationType.includes("nghỉ")
        ) {
          await loadLeaveRequests();
          setActiveTab("leaves");
          setSidebarOpen(false);
        }
      } catch (err) {
        console.error("Lỗi xử lý thông báo:", err);
      }
    },
    [apiRequest, loadLeaveRequests]
  );

  // ======================================
  // ĐÁNH DẤU TẤT CẢ THÔNG BÁO ĐÃ ĐỌC
  // ======================================

  const handleMarkAllRead = useCallback(async () => {
    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH",
      });

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          read: true,
        }))
      );
    } catch (err) {
      console.error(
        "Lỗi đánh dấu tất cả thông báo:",
        err
      );
    }
  }, [apiRequest]);

  // ======================================
  // TẢI TOÀN BỘ DASHBOARD
  // ======================================

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        loadEmployees(),
        loadLeaveRequests(),
        loadProjects(),
        loadNotifications(),
      ]);

      const failed = results.filter(
        (item) => item.status === "rejected"
      );

      if (failed.length > 0) {
        const messages = failed.map(
          (item) => item.reason?.message || "Lỗi tải dữ liệu"
        );

        setError(messages.join(" | "));
      }
    } finally {
      setLoading(false);
    }
  }, [
    loadEmployees,
    loadLeaveRequests,
    loadProjects,
    loadNotifications,
  ]);

  // ======================================
  // TỰ ĐỘNG TẢI KHI MỞ DASHBOARD
  // ======================================

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ======================================
  // KIỂM TRA THÔNG BÁO MỖI 15 GIÂY
  // ======================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // ======================================
  // TẢI LẠI KHI QUAY LẠI TRÌNH DUYỆT
  // ======================================

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    };

    window.addEventListener("focus", loadDashboard);

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener("focus", loadDashboard);

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadDashboard]);

  // ======================================
  // GỘP NHÂN VIÊN VÀ KẾ TOÁN
  // ======================================

  const allStaff = useMemo(() => {
    const employeeItems = employees.map((item) => ({
      ...item,
      accountType: "Nhân viên",
    }));

    const accountantItems = accountants.map((item) => ({
      ...item,
      accountType: "Kế toán",
    }));

    return [...employeeItems, ...accountantItems];
  }, [employees, accountants]);

  // ======================================
  // THỐNG KÊ
  // ======================================

  const totalEmployees = allStaff.length;

  const workingEmployees = allStaff.filter(isWorking).length;

  const pendingLeaveCount =
    leaveRequests.filter(isPending).length;

  const activeProjectCount =
    projects.filter(isProjectActive).length;

  // ======================================
  // NHÂN SỰ MỚI NHẤT
  // ======================================

  const latestStaff = useMemo(() => {
    return [...allStaff]
      .sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      })
      .slice(0, 5);
  }, [allStaff]);

  // ======================================
  // THẺ THỐNG KÊ
  // ======================================

  const stats = [
    {
      title: "Tổng nhân viên",
      value: totalEmployees,
      note: "Bao gồm nhân viên và kế toán",
      icon: Users,
      color: "blue",
    },
    {
      title: "Đang làm việc",
      value: workingEmployees,
      note: "Tài khoản đang hoạt động",
      icon: UserCheck,
      color: "green",
    },
    {
      title: "Đơn nghỉ chờ duyệt",
      value: pendingLeaveCount,
      note: "Yêu cầu cần xử lý",
      icon: CalendarClock,
      color: "orange",
    },
    {
      title: "Dự án đang chạy",
      value: activeProjectCount,
      note: "Dự án chưa hoàn thành",
      icon: FolderKanban,
      color: "purple",
    },
  ];

  // ======================================
  // CHUYỂN TAB
  // ======================================

  const handleChangeTab = useCallback((tab) => {
    const normalizedTab = normalizeTab(tab);

    setActiveTab(normalizedTab);
    setSidebarOpen(false);
  }, []);

  // ======================================
  // ĐĂNG XUẤT
  // ======================================

  const handleLogout = useCallback(() => {
    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

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

  // ======================================
  // TIÊU ĐỀ TRANG
  // ======================================

  const pageTitles = {
    overview: "Tổng quan hệ thống",
    employees: "Quản lý nhân viên",
    attendance: "Quản lý chấm công",
    payroll: "Quản lý bảng lương",
    leaves: "Duyệt đơn nghỉ",
    projects: "Quản lý dự án",
    rewards: "Thưởng và phạt",
    finance: "Quản lý thu chi",
  };

  // ======================================
  // GIAO DIỆN TỔNG QUAN
  // ======================================

  const renderOverview = () => (
    <>
      <div className="manager-overview-heading">
        <div>
          <h2>Tổng quan hệ thống</h2>
          <p>
            Theo dõi tình hình nhân sự và hoạt động công ty.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />

          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {error && (
        <div className="manager-error-message">
          Không thể tải một số dữ liệu: {error}
        </div>
      )}

      <div className="manager-stats">
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* ĐƠN NGHỈ VÀ DỰ ÁN */}

      <div className="overview-grid">
        <section className="manager-panel">
          <div className="panel-heading">
            <div>
              <h2>Đơn nghỉ chờ duyệt</h2>
              <p>Các yêu cầu cần được xử lý</p>
            </div>

            <button
              type="button"
              className="text-btn"
              onClick={() => handleChangeTab("leaves")}
            >
              Xem tất cả
            </button>
          </div>

          {leaveRequests.filter(isPending).length === 0 ? (
            <div className="empty-state">
              Chưa có đơn nghỉ chờ duyệt.
            </div>
          ) : (
            leaveRequests
              .filter(isPending)
              .slice(0, 4)
              .map((item) => (
                <div
                  className="overview-leave"
                  key={item._id || item.id}
                >
                  <div className="avatar">
                    {getInitials(
                      item.employeeName ||
                      item.employee?.name ||
                      item.user?.name ||
                      "NV"
                    )}
                  </div>

                  <div className="overview-leave-info">
                    <strong>
                      {item.employeeName ||
                        item.employee?.name ||
                        item.user?.name ||
                        "Nhân viên"}
                    </strong>

                    <span>
                      {item.reason || item.type || "Đơn xin nghỉ"}
                    </span>
                  </div>

                  <span className="status-badge pending">
                    Chờ duyệt
                  </span>
                </div>
              ))
          )}
        </section>

        <section className="manager-panel">
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

          {projects.filter(isProjectActive).length === 0 ? (
            <div className="empty-state">
              Chưa có dự án đang chạy.
            </div>
          ) : (
            projects
              .filter(isProjectActive)
              .slice(0, 4)
              .map((project) => {
                const progress = Math.min(
                  100,
                  Math.max(0, Number(project.progress || 0))
                );

                return (
                  <div
                    className="overview-project"
                    key={project._id || project.id}
                  >
                    <div className="overview-project-heading">
                      <strong>
                        {project.name || project.title}
                      </strong>

                      <span>{progress}%</span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
          )}
        </section>
      </div>

      {/* NHÂN SỰ MỚI NHẤT */}

      <section className="manager-panel">
        <div className="panel-heading">
          <div>
            <h2>Nhân sự mới nhất</h2>
            <p>
              Danh sách nhân viên và kế toán trong hệ thống.
            </p>
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
                <th>Loại tài khoản</th>
                <th>Phòng ban</th>
                <th>Chức vụ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {latestStaff.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    {loading
                      ? "Đang tải dữ liệu..."
                      : "Chưa có nhân sự"}
                  </td>
                </tr>
              ) : (
                latestStaff.map((employee) => {
                  const status = getStaffStatus(employee);

                  return (
                    <tr key={employee._id || employee.id}>
                      <td>
                        <div className="employee-cell">
                          <div className="avatar">
                            {getInitials(employee.name)}
                          </div>

                          <div>
                            <strong>
                              {employee.name || "Chưa cập nhật"}
                            </strong>

                            <small>
                              {employee.employeeCode ||
                                employee.email ||
                                "Chưa có mã"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{employee.accountType}</td>

                      <td>
                        {employee.department || "Chưa cập nhật"}
                      </td>

                      <td>
                        {employee.position ||
                          (employee.accountType === "Kế toán"
                            ? "Kế toán"
                            : "Chưa cập nhật")}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            status === "working"
                              ? "approved"
                              : status === "probation"
                              ? "pending"
                              : "rejected"
                          }`}
                        >
                          {{
                            working: "Đang làm việc",
                            probation: "Thử việc",
                            resigned: "Đã nghỉ việc",
                            locked: "Đã khóa",
                          }[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  // ======================================
  // HIỂN THỊ TRANG
  // ======================================

  const renderPage = () => {
    switch (normalizeTab(activeTab)) {
      case "overview":
        return renderOverview();

      case "employees":
        return <ManagerEmployees />;

      case "leaves":
        return (
          <ManagerLeaveRequests
            requests={leaveRequests}
            onRefresh={loadLeaveRequests}
            loading={loading}
            error={error}
          />
        );

      case "projects":
        return <ManagerProjects />;

      case "rewards":
        return <ManagerRewards />;

      case "attendance":
        return <ManagerAttendance />;

      case "payroll":
        return <ManagerPayroll />;

      case "finance":
        return <ManagerCompanyFinance />;

      default:
        return renderOverview();
    }
  };

  // ======================================
  // MAIN
  // ======================================

  return (
    <div className="manager-layout">
      <ManagerSidebar
        activeTab={activeTab}
        setActiveTab={handleChangeTab}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onLogout={handleLogout}
        user={user}
      />

      <main className="manager-main">
        <ManagerHeader
          setOpen={setSidebarOpen}
          title={pageTitles[normalizeTab(activeTab)] || "Tổng quan"}
          user={user}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onNotificationClick={handleNotificationClick}
        />

        <div className="manager-content">
          {renderPage()}
        </div>

        <footer className="manager-footer">
          © 2026 Internal Management. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

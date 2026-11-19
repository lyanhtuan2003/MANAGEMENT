
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

import {
  Clock,
  Wallet,
  CalendarCheck,
  BriefcaseBusiness,
  ArrowUpRight,
  CalendarDays,
  RefreshCw,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import StatCard from "../common/StatCard";
import ProgressBar from "../common/ProgressBar";

// =====================================================
// API CONFIG
// =====================================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE = RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_URL = `${API_BASE}/api`;

// =====================================================
// AUTH
// =====================================================

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

// =====================================================
// DATE HELPERS
// =====================================================

const getVietnamToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getCurrentMonth = () => getVietnamToday().slice(0, 7);

const formatDate = (value) => {
  if (!value) return "--";

  const dateString = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatTime = (value) => {
  if (!value) return "--:--";

  if (/^\d{2}:\d{2}$/.test(String(value))) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

// =====================================================
// API REQUEST
// =====================================================

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại."
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Yêu cầu thất bại (${response.status}).`
    );
  }

  return data;
}

// =====================================================
// LẤY MẢNG DỮ LIỆU TỪ RESPONSE
// =====================================================

const getArray = (data, key) => {
  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data?.[key])) {
    return data.data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

// =====================================================
// EMPLOYEE OVERVIEW
// =====================================================

export default function EmployeeOverview({ setActivePage }) {
  const [user] = useState(getStoredUser);

  const [attendance, setAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payrolls, setPayrolls] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState([]);

  const currentMonth = getCurrentMonth();

  const [currentYear, currentMonthNumber] =
    currentMonth.split("-").map(Number);

  const currentDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());

  // =====================================================
  // TẢI DỮ LIỆU DASHBOARD
  // =====================================================

  const loadDashboard = useCallback(async () => {
    if (!getToken()) {
      setError(
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setWarnings([]);

    const results = await Promise.allSettled([
      // 1. CHẤM CÔNG
      apiRequest(
        `/attendance/me?month=${encodeURIComponent(currentMonth)}`
      ),

      // 2. NGHỈ PHÉP
      apiRequest("/leave/me"),

      // 3. DỰ ÁN
      apiRequest("/projects/me"),

      // 4. BẢNG LƯƠNG
      apiRequest(
        `/payroll/me?month=${currentMonthNumber}&year=${currentYear}`
      ),
    ]);

    const nextWarnings = [];

    // =================================================
    // 1. ATTENDANCE
    // =================================================

    if (results[0].status === "fulfilled") {
      const data = results[0].value;

      const records = Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.data?.records)
        ? data.data.records
        : [];

      setAttendance(records);

      setTodayRecord(
        data.todayRecord ||
        data.data?.todayRecord ||
        null
      );
    } else {
      console.error(
        "Lỗi tải chấm công:",
        results[0].reason
      );

      setAttendance([]);
      setTodayRecord(null);

      nextWarnings.push("Không tải được dữ liệu chấm công.");
    }

    // =================================================
    // 2. LEAVE REQUESTS
    // Backend:
    // GET /api/leave/me
    // { success: true, requests: [...] }
    // =================================================

    if (results[1].status === "fulfilled") {
      const data = results[1].value;

      // Đọc đúng trường requests từ leave.controller.js
      const requests = getArray(data, "requests");

      setLeaveRequests(requests);

      console.log("Đơn nghỉ phép từ API:", requests);
      console.log(
        "Tổng số đơn nghỉ phép:",
        requests.length
      );
    } else {
      console.error(
        "Lỗi tải đơn nghỉ phép:",
        results[1].reason
      );

      setLeaveRequests([]);

      nextWarnings.push(
        "Không tải được danh sách nghỉ phép."
      );
    }

    // =================================================
    // 3. PROJECTS
    // =================================================

    if (results[2].status === "fulfilled") {
      const data = results[2].value;

      setProjects(getArray(data, "projects"));
    } else {
      console.error(
        "Lỗi tải dự án:",
        results[2].reason
      );

      setProjects([]);

      nextWarnings.push("Không tải được danh sách dự án.");
    }

    // =================================================
    // 4. PAYROLL
    // =================================================

    if (results[3].status === "fulfilled") {
      const data = results[3].value;

      setPayrolls(getArray(data, "payrolls"));
    } else {
      console.error(
        "Lỗi tải bảng lương:",
        results[3].reason
      );

      setPayrolls([]);

      nextWarnings.push("Không tải được dữ liệu bảng lương.");
    }

    setWarnings(nextWarnings);
    setLoading(false);
  }, [currentMonth, currentMonthNumber, currentYear]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =====================================================
  // TRẠNG THÁI CHẤM CÔNG
  // =====================================================

  const checkedIn = Boolean(
    todayRecord?.checkIn ||
    todayRecord?.checkInTime
  );

  const checkedOut = Boolean(
    todayRecord?.checkOut ||
    todayRecord?.checkOutTime
  );

  const todayCheckIn = formatTime(
    todayRecord?.checkIn ||
    todayRecord?.checkInTime
  );

  const todayCheckOut = formatTime(
    todayRecord?.checkOut ||
    todayRecord?.checkOutTime
  );

  // =====================================================
  // CHẤM CÔNG VÀO / RA
  // =====================================================

  const handleAttendance = async (type) => {
    if (loading || submitting) return;

    if (type === "check-in" && checkedIn) return;

    if (type === "check-out" && (!checkedIn || checkedOut)) {
      return;
    }

    try {
      setSubmitting(type);
      setError("");
      setMessage("");

      const data = await apiRequest(
        type === "check-in"
          ? "/attendance/check-in"
          : "/attendance/check-out",
        {
          method: type === "check-in" ? "POST" : "PATCH",
        }
      );

      setMessage(
        data.message || "Chấm công thành công."
      );

      await loadDashboard();
    } catch (err) {
      console.error("Attendance error:", err);

      setError(
        err.message || "Không thể thực hiện chấm công."
      );

      await loadDashboard();
    } finally {
      setSubmitting("");
    }
  };

  // =====================================================
  // THỐNG KÊ NGÀY CÔNG
  // =====================================================

  const currentMonthAttendance = useMemo(() => {
    return attendance.filter((item) =>
      String(item.date || "").startsWith(currentMonth)
    );
  }, [attendance, currentMonth]);

  const workingDays = currentMonthAttendance.filter(
    (item) => Boolean(item.checkIn)
  ).length;

  const totalWorkingDays = 26;

  // =====================================================
  // THỐNG KÊ ĐƠN NGHỈ PHÉP
  // Model LeaveRequest:
  // employeeId
  // status: pending | approved | rejected
  // =====================================================

  const pendingLeaves = useMemo(() => {
    return leaveRequests.filter((request) => {
      return (
        String(request.status || "")
          .trim()
          .toLowerCase() === "pending"
      );
    });
  }, [leaveRequests]);

  const pendingLeaveCount = pendingLeaves.length;

  // =====================================================
  // THỐNG KÊ DỰ ÁN
  // =====================================================

  const activeProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = String(project.status || "")
        .trim()
        .toLowerCase();

      return ![
        "completed",
        "cancelled",
        "đã hoàn thành",
        "đã hủy",
        "hoàn thành",
      ].includes(status);
    });
  }, [projects]);

  // =====================================================
  // THỐNG KÊ BẢNG LƯƠNG
  // =====================================================

  const currentPayroll = useMemo(() => {
    return (
      payrolls.find(
        (item) =>
          Number(item.month) === currentMonthNumber &&
          Number(item.year) === currentYear
      ) || null
    );
  }, [payrolls, currentMonthNumber, currentYear]);

  const basicSalary = Number(
    currentPayroll?.basicSalary || 0
  );

  const allowance = Number(
    currentPayroll?.allowance || 0
  );

  const bonus = Number(
    currentPayroll?.bonus || 0
  );

  const deduction = Number(
    currentPayroll?.deduction || 0
  );

  const totalSalary = Number(
    currentPayroll?.totalSalary || 0
  );

  const hasPayrollData = Boolean(currentPayroll);

  // =====================================================
  // LỊCH SỬ CHẤM CÔNG GẦN ĐÂY
  // =====================================================

  const recentAttendance = useMemo(() => {
    return [...attendance]
      .sort((a, b) =>
        String(b.date || "").localeCompare(
          String(a.date || "")
        )
      )
      .slice(0, 3);
  }, [attendance]);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="employee-page">

      {/* WELCOME */}

      <div className="employee-welcome">
        <div>
          <span className="welcome-label">
            CHÀO MỪNG BẠN TRỞ LẠI
          </span>

          <h1>
            Xin chào, {user?.name || "Nhân viên"}! 👋
          </h1>

          <p>
            Chúc bạn có một ngày làm việc thật hiệu quả.
          </p>
        </div>

        <div className="welcome-date">
          <CalendarDays size={19} />
          {currentDate}
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="employee-dashboard-toolbar">
        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle size={15} />
          ) : (
            <RefreshCw size={15} />
          )}

          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* WARNINGS */}

      {warnings.length > 0 && (
        <div className="attendance-alert warning">
          <AlertCircle size={18} />
          <span>{warnings.join(" ")}</span>
        </div>
      )}

      {error && (
        <div className="attendance-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="attendance-alert success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* STATISTICS */}

      <div className="employee-stats-grid">

        <StatCard
          title="Ngày công tháng này"
          value={`${workingDays}/${totalWorkingDays}`}
          description="Ngày công đã ghi nhận"
          icon={CalendarCheck}
          color="blue"
        />

        <StatCard
          title="Lương dự kiến"
          value={
            hasPayrollData
              ? `${(totalSalary / 1000000).toFixed(1)}tr`
              : "--"
          }
          description={
            hasPayrollData
              ? "Thu nhập dự kiến tháng này"
              : "Chưa tạo bảng lương"
          }
          icon={Wallet}
          color="green"
        />

        <StatCard
          title="Đơn xin nghỉ"
          value={String(pendingLeaveCount).padStart(2, "0")}
          description={
            loading
              ? "Đang tải dữ liệu..."
              : "Đang chờ phê duyệt"
          }
          icon={CalendarDays}
          color="orange"
        />

        <StatCard
          title="Dự án tham gia"
          value={activeProjects.length}
          description="Dự án đang thực hiện"
          icon={BriefcaseBusiness}
          color="purple"
        />

      </div>

      {/* ATTENDANCE AND SALARY */}

      <div className="employee-content-grid">

        {/* ATTENDANCE */}

        <section className="employee-panel attendance-panel">

          <div className="employee-panel-heading">
            <div>
              <h2>Chấm công hôm nay</h2>
              <p>Ghi nhận thời gian làm việc của bạn</p>
            </div>

            <span className="live-status">
              <i />
              Hôm nay
            </span>
          </div>

          <div className="attendance-time">

            <div className="attendance-time-box">
              <span>GIỜ VÀO</span>
              <h2>{todayCheckIn}</h2>
            </div>

            <div className="attendance-time-divider" />

            <div className="attendance-time-box">
              <span>GIỜ RA</span>
              <h2>{todayCheckOut}</h2>
            </div>

          </div>

          <div className="attendance-actions">

            <button
              type="button"
              className="attendance-button check-in-button"
              disabled={
                loading ||
                Boolean(submitting) ||
                checkedIn
              }
              onClick={() => handleAttendance("check-in")}
            >
              {submitting === "check-in" ? (
                <LoaderCircle size={17} />
              ) : (
                <Clock size={17} />
              )}

              {checkedIn
                ? "Đã chấm công vào"
                : "Chấm công vào"}
            </button>

            <button
              type="button"
              className="attendance-button check-out-button"
              disabled={
                loading ||
                Boolean(submitting) ||
                !checkedIn ||
                checkedOut
              }
              onClick={() => handleAttendance("check-out")}
            >
              {submitting === "check-out" ? (
                <LoaderCircle size={17} />
              ) : (
                <ArrowUpRight size={17} />
              )}

              {checkedOut
                ? "Đã chấm công ra"
                : "Chấm công ra"}
            </button>

          </div>

          <p className="attendance-note">
            {checkedOut
              ? "Bạn đã hoàn thành chấm công hôm nay."
              : checkedIn
              ? "Bạn đã chấm công vào. Hãy chấm công ra khi kết thúc ngày làm việc."
              : "Bạn chưa chấm công vào hôm nay."}
          </p>

        </section>

        {/* SALARY */}

        <section className="employee-panel salary-panel">

          <div className="employee-panel-heading">
            <div>
              <h2>Thu nhập tháng này</h2>

              <p>
                Tháng {currentMonthNumber}/{currentYear}
              </p>
            </div>

            <div className="salary-icon">
              <Wallet size={21} />
            </div>
          </div>

          <div className="salary-total">
            <span>Tổng thu nhập dự kiến</span>

            <h1>
              {hasPayrollData
                ? formatMoney(totalSalary)
                : "Chưa tạo bảng lương"}
            </h1>

            {hasPayrollData && (
              <small>
                Trạng thái:{" "}
                {currentPayroll.status === "paid"
                  ? "Đã thanh toán"
                  : currentPayroll.status === "draft"
                  ? "Chưa thanh toán"
                  : currentPayroll.status}
              </small>
            )}
          </div>

          <div className="salary-detail">

            <div>
              <span>Lương cơ bản</span>
              <strong>{formatMoney(basicSalary)}</strong>
            </div>

            <div>
              <span>Phụ cấp</span>
              <strong>+{formatMoney(allowance)}</strong>
            </div>

            <div>
              <span>Thưởng</span>
              <strong className="text-green">
                +{formatMoney(bonus)}
              </strong>
            </div>

            <div>
              <span>Khấu trừ</span>
              <strong className="text-red">
                -{formatMoney(deduction)}
              </strong>
            </div>

          </div>

          <button
            type="button"
            className="salary-detail-button"
            onClick={() => setActivePage?.("payroll")}
          >
            Xem bảng lương chi tiết
            <ArrowUpRight size={16} />
          </button>

        </section>

      </div>

      {/* MY PROJECTS */}

      <section className="employee-panel projects-panel">

        <div className="employee-panel-heading">
          <div>
            <h2>Dự án của tôi</h2>
            <p>Các dự án bạn đang được phân công</p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={() => setActivePage?.("projects")}
          >
            Xem tất cả
            <ArrowUpRight size={15} />
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <p className="empty-state">
            {loading
              ? "Đang tải dự án..."
              : "Bạn chưa được phân công dự án nào."}
          </p>
        ) : (
          <div className="project-grid">

            {activeProjects.slice(0, 2).map((project) => {
              const progress = Math.min(
                100,
                Math.max(0, Number(project.progress) || 0)
              );

              return (
                <div
                  className="employee-project-card"
                  key={project._id}
                >

                  <div className="project-card-top">
                    <span className="project-code">
                      {project.code || "DỰ ÁN"}
                    </span>

                    <span className="project-status">
                      {project.status || "Đang thực hiện"}
                    </span>
                  </div>

                  <h3>
                    {project.name || project.title || "Dự án"}
                  </h3>

                  <p>
                    {project.description || "Chưa có mô tả."}
                  </p>

                  <div className="project-progress-info">
                    <span>Tiến độ</span>
                    <strong>{progress}%</strong>
                  </div>

                  <ProgressBar progress={progress} />

                  <div className="project-card-footer">
                    <span>
                      <CalendarDays size={14} />
                      {formatDate(
                        project.endDate || project.deadline
                      )}
                    </span>

                    <span>
                      {Array.isArray(project.members)
                        ? project.members.length
                        : 0}{" "}
                      thành viên
                    </span>
                  </div>

                </div>
              );
            })}

          </div>
        )}

      </section>

      {/* RECENT ATTENDANCE */}

      <section className="employee-panel recent-attendance">

        <div className="employee-panel-heading">
          <div>
            <h2>Lịch sử chấm công gần đây</h2>
            <p>Theo dõi thời gian làm việc của bạn</p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={() => setActivePage?.("attendance")}
          >
            Xem tất cả
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="employee-table-scroll">
          <table className="employee-table">

            <thead>
              <tr>
                <th>NGÀY</th>
                <th>GIỜ VÀO</th>
                <th>GIỜ RA</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>

            <tbody>
              {recentAttendance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    {loading
                      ? "Đang tải dữ liệu..."
                      : "Chưa có dữ liệu chấm công."}
                  </td>
                </tr>
              ) : (
                recentAttendance.map((item) => (
                  <tr key={item._id || item.date}>

                    <td>{formatDate(item.date)}</td>

                    <td>{formatTime(item.checkIn)}</td>

                    <td>{formatTime(item.checkOut)}</td>

                    <td>
                      <span className="attendance-status">
                        {item.checkOut
                          ? "Đã hoàn thành"
                          : item.checkIn
                          ? "Đang làm việc"
                          : item.status || "Chưa ghi nhận"}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

      </section>

    </div>
  );
}

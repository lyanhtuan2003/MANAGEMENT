import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  Users,
  CalendarDays,
  AlertTriangle,
  RefreshCw,
  Search,
  Settings,
  X,
  Save,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
};

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("vi-VN");

// LẤY SỐ PHÚT ĐI MUỘN ĐÃ LƯU
const getStoredLateMinutes = (record) =>
  Math.max(0, Number(record?.lateMinutes || 0));

// LẤY SỐ PHÚT VỀ SỚM ĐÃ LƯU
const getStoredEarlyLeaveMinutes = (record) =>
  Math.max(0, Number(record?.earlyLeaveMinutes || 0));

function StatCard({ icon: Icon, title, value, color, note }) {
  return (
    <div className="manager-stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div className="stat-content">
        <span>{title}</span>
        <h2>{value ?? 0}</h2>
        <small>{note}</small>
      </div>
    </div>
  );
}

export default function ManagerAttendance() {
  const [month, setMonth] = useState(getCurrentMonth);

  const [data, setData] = useState({
    employees: [],
    records: [],

    summary: {
      total: 0,
      workDays: 0,
      lateCount: 0,
      lateMinutes: 0,
    },

    schedule: {
      startTime: "08:30",
      endTime: "17:30",
    },
  });

  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [showSchedule, setShowSchedule] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    startTime: "08:30",
    endTime: "17:30",
  });

  const [savingSchedule, setSavingSchedule] = useState(false);

  // =====================================================
  // GỌI API
  // =====================================================

  const request = useCallback(async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(`${API_URL}${url}`, {
      ...options,

      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),

        Authorization: `Bearer ${token}`,

        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        result.message ||
          "Phiên đăng nhập hết hạn hoặc bạn không có quyền truy cập."
      );
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || `Lỗi máy chủ (${response.status}).`
      );
    }

    return result;
  }, []);

  // =====================================================
  // TẢI DỮ LIỆU CHẤM CÔNG
  // =====================================================

  const loadAttendance = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      try {
        const result = await request(
          `/attendance/manager?month=${encodeURIComponent(month)}`
        );

        const nextSchedule = result.schedule || {
          startTime: "08:30",
          endTime: "17:30",
        };

        setData({
          employees: Array.isArray(result.employees)
            ? result.employees
            : [],

          records: Array.isArray(result.records)
            ? result.records
            : [],

          summary: result.summary || {
            total: 0,
            workDays: 0,
            lateCount: 0,
            lateMinutes: 0,
          },

          schedule: nextSchedule,
        });

        setScheduleForm({
          startTime: nextSchedule.startTime || "08:30",
          endTime: nextSchedule.endTime || "17:30",
        });
      } catch (err) {
        setError(
          err.message || "Không thể tải dữ liệu chấm công."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [month, request]
  );

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // =====================================================
  // LẤY BẢN GHI CHẤM CÔNG MỚI NHẤT CỦA TỪNG NHÂN VIÊN
  // =====================================================

  const recordMap = useMemo(() => {
    const map = new Map();

    [...data.records]
      .sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || ""))
      )
      .forEach((record) => {
        const employeeId = String(record.employeeId || "");

        if (employeeId && !map.has(employeeId)) {
          map.set(employeeId, record);
        }
      });

    return map;
  }, [data.records]);

  // =====================================================
  // TÌM KIẾM NHÂN VIÊN
  // =====================================================

  const filteredEmployees = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return data.employees.filter((employee) => {
      const record = recordMap.get(String(employee.id));

      const content = [
        employee.name,
        employee.employeeCode,
        employee.department,
        employee.position,
        record?.date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !search || content.includes(search);
    });
  }, [data.employees, keyword, recordMap]);

  // =====================================================
  // MỞ CÀI ĐẶT GIỜ LÀM VIỆC
  // =====================================================

  const openScheduleModal = () => {
    setError("");
    setMessage("");

    setScheduleForm({
      startTime: data.schedule.startTime || "08:30",
      endTime: data.schedule.endTime || "17:30",
    });

    setShowSchedule(true);
  };

  // =====================================================
  // LƯU GIỜ LÀM VIỆC MỚI
  // =====================================================

  const handleSaveSchedule = async (event) => {
    event.preventDefault();

    if (savingSchedule) return;

    setError("");
    setMessage("");

    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setError(
        "Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc."
      );
      return;
    }

    if (scheduleForm.endTime <= scheduleForm.startTime) {
      setError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    setSavingSchedule(true);

    try {
      const result = await request("/attendance/schedule", {
        method: "PUT",

        body: JSON.stringify({
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
        }),
      });

      const nextSchedule = result.schedule || scheduleForm;

      setData((previous) => ({
        ...previous,
        schedule: nextSchedule,
      }));

      setScheduleForm({
        startTime: nextSchedule.startTime,
        endTime: nextSchedule.endTime,
      });

      setShowSchedule(false);

      if (result.notificationSent) {
        setMessage(
          `Cập nhật giờ làm việc thành công: ${nextSchedule.startTime} - ${nextSchedule.endTime}. Đã gửi thông báo cho ${result.notificationCount || 0} nhân viên. Lịch sử chấm công cũ được giữ nguyên.`
        );
      } else {
        setMessage(
          "Đã cập nhật giờ làm việc nhưng chưa gửi được thông báo cho nhân viên. Vui lòng kiểm tra hệ thống thông báo."
        );
      }

      // Tải lại bảng chấm công.
      // Không cập nhật lại các bản ghi lịch sử.
      await loadAttendance(false);
    } catch (err) {
      setError(
        err.message || "Không thể cập nhật giờ làm việc."
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  // =====================================================
  // THỐNG KÊ
  // =====================================================

  const totalEmployees = Number(
    data.summary.total ?? data.employees.length
  );

  const totalWorkDays = Number(
    data.summary.workDays || 0
  );

  const totalLateCount = Number(
    data.summary.lateCount || 0
  );

  const totalLateMinutes = Number(
    data.summary.lateMinutes || 0
  );

  // =====================================================
  // GIAO DIỆN
  // =====================================================

  return (
    <section className="manager-panel manager-data-page">
      {/* HEADER */}

      <div className="manager-data-heading">
        <div>
          <h2>Quản lý chấm công</h2>

          <p>
            Theo dõi thời gian làm việc và tình trạng chấm công của nhân viên.
          </p>
        </div>

        <div className="manager-data-actions">
          <button
            type="button"
            className="manager-action-button"
            onClick={openScheduleModal}
          >
            <Settings size={16} />
            Giờ làm việc
          </button>

          <button
            type="button"
            className="manager-action-button primary"
            onClick={() => loadAttendance()}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "spin" : ""}
            />

            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* BỘ LỌC */}

      <div className="manager-filter-row">
        <label className="manager-month-filter">
          <CalendarDays size={17} />

          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>

        <div className="manager-search-filter">
          <Search size={17} />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tên, mã nhân viên, phòng ban..."
          />
        </div>
      </div>

      {/* THÔNG BÁO */}

      {error && (
        <div className="manager-error-message" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="manager-success-message" role="status">
          {message}
        </div>
      )}

      {/* THỐNG KÊ */}

      <div className="manager-stats">
        <StatCard
          icon={Users}
          title="Tổng nhân viên"
          value={formatNumber(totalEmployees)}
          color="blue"
          note="Nhân viên trong hệ thống"
        />

        <StatCard
          icon={CalendarDays}
          title="Tổng lượt công"
          value={formatNumber(totalWorkDays)}
          color="green"
          note="Lượt có chấm công vào"
        />

        <StatCard
          icon={AlertTriangle}
          title="Lượt đi muộn"
          value={formatNumber(totalLateCount)}
          color="orange"
          note={`${formatNumber(totalLateMinutes)} phút đi muộn`}
        />

        <StatCard
          icon={Clock}
          title="Giờ làm việc"
          value={`${data.schedule.startTime || "--:--"} - ${
            data.schedule.endTime || "--:--"
          }`}
          color="purple"
          note="Khung giờ hiện tại"
        />
      </div>

      {/* BẢNG CHẤM CÔNG */}

      <div className="manager-table-section">
        <div className="panel-heading">
          <div>
            <h2>Bảng chấm công nhân viên</h2>

            <p>
              Tháng {month.split("-").reverse().join("/")} ·{" "}
              {filteredEmployees.length} nhân viên
            </p>
          </div>
        </div>

        <div className="responsive-table">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Ngày chấm công gần nhất</th>
                <th>Giờ vào</th>
                <th>Giờ ra</th>
                <th>Đi muộn</th>
                <th>Về sớm</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {loading
                      ? "Đang tải dữ liệu..."
                      : "Không có dữ liệu chấm công."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const record = recordMap.get(
                    String(employee.id)
                  );

                  // Dùng số liệu đã lưu, không tính theo lịch mới.
                  const late = getStoredLateMinutes(record);

                  const early =
                    getStoredEarlyLeaveMinutes(record);

                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="employee-cell">
                          <div className="avatar">
                            {(employee.name || "N")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {employee.name || "Chưa cập nhật"}
                            </strong>

                            <small>
                              {employee.employeeCode || "Chưa có mã"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{employee.department || "—"}</td>

                      <td>
                        {record?.date
                          ? formatDate(record.date)
                          : "Chưa chấm công"}
                      </td>

                      <td>{record?.checkIn || "—"}</td>

                      <td>{record?.checkOut || "—"}</td>

                      <td>
                        {record?.checkIn && late > 0 ? (
                          <span className="status-badge pending">
                            {formatNumber(late)} phút
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        {record?.checkOut && early > 0 ? (
                          <span className="status-badge rejected">
                            {formatNumber(early)} phút
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            record?.checkIn
                              ? "approved"
                              : "pending"
                          }`}
                        >
                          {record?.checkIn
                            ? record?.checkOut
                              ? "Đã chấm công"
                              : "Đang làm việc"
                            : "Chưa chấm công"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CÀI ĐẶT GIỜ LÀM VIỆC */}

      {showSchedule && (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSchedule(false);
            }
          }}
        >
          <form
            className="manager-modal"
            onSubmit={handleSaveSchedule}
          >
            <div className="manager-modal-heading">
              <div>
                <h3>Cài đặt giờ làm việc</h3>

                <p>
                  Giờ làm mới chỉ áp dụng cho các lượt chấm công
                  phát sinh sau khi lưu. Lịch sử cũ được giữ nguyên.
                  Nhân viên sẽ nhận được thông báo về thay đổi này.
                </p>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setShowSchedule(false)}
                aria-label="Đóng"
                disabled={savingSchedule}
              >
                <X size={18} />
              </button>
            </div>

            <label className="manager-form-field">
              <span>Giờ bắt đầu</span>

              <input
                type="time"
                value={scheduleForm.startTime}
                onChange={(event) =>
                  setScheduleForm((previous) => ({
                    ...previous,
                    startTime: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="manager-form-field">
              <span>Giờ kết thúc</span>

              <input
                type="time"
                value={scheduleForm.endTime}
                onChange={(event) =>
                  setScheduleForm((previous) => ({
                    ...previous,
                    endTime: event.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="manager-modal-actions">
              <button
                type="button"
                className="manager-action-button"
                onClick={() => setShowSchedule(false)}
                disabled={savingSchedule}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="manager-action-button primary"
                disabled={savingSchedule}
              >
                <Save size={16} />

                {savingSchedule
                  ? "Đang lưu..."
                  : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
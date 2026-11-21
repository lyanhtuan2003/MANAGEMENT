import { useCallback, useEffect, useMemo, useState } from "react";
import "./ManagerAttendance.css";
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("vi-VN");

const getStoredLateMinutes = (record) =>
  Math.max(0, Number(record?.lateMinutes || 0));

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
  const getTodayDate = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  // LỊCH SỬ CHẤM CÔNG RIÊNG TỪNG NHÂN VIÊN
  const [selectedHistoryEmployee, setSelectedHistoryEmployee] = useState(null);
  const [historyFromDate, setHistoryFromDate] = useState(
    `${getTodayDate().slice(0, 7)}-01`
  );
  const [historyToDate, setHistoryToDate] = useState(getTodayDate);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    startTime: "08:30",
    endTime: "17:30",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // GỌI API
  const request = useCallback(async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.");
    }

    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
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
      throw new Error(result.message || `Lỗi máy chủ (${response.status}).`);
    }

    return result;
  }, []);

  // TẢI DỮ LIỆU CHẤM CÔNG
  const loadAttendance = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError("");

      try {
        const result = await request(
          `/attendance/manager?date=${encodeURIComponent(selectedDate)}`
        );

        const nextSchedule = result.schedule || {
          startTime: "08:30",
          endTime: "17:30",
        };

        setData({
          employees: Array.isArray(result.employees) ? result.employees : [],
          records: Array.isArray(result.records) ? result.records : [],
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
        setError(err.message || "Không thể tải dữ liệu chấm công.");
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [selectedDate, request]
  );

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // TẢI LỊCH SỬ RIÊNG CỦA NHÂN VIÊN
  const loadEmployeeHistory = async (
    from = historyFromDate,
    to = historyToDate,
    employeeId = selectedHistoryEmployee?.id
  ) => {
    if (!employeeId) return;

    if (!from || !to) {
      setHistoryError("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
      return;
    }

    if (from > to) {
      setHistoryError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const query = new URLSearchParams({ from, to });
      const result = await request(
        `/attendance/manager/history?${query.toString()}`
      );

      const records = Array.isArray(result.records) ? result.records : [];

      setHistoryRecords(
        records.filter((record) => {
          const recordEmployeeId = String(
            record.employeeId?._id || record.employeeId || ""
          );

          return recordEmployeeId === String(employeeId);
        })
      );
    } catch (err) {
      setHistoryError(err.message || "Không thể tải lịch sử chấm công.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // MỞ LỊCH SỬ CỦA NHÂN VIÊN
  const openEmployeeHistory = (employee) => {
    const from = `${getTodayDate().slice(0, 7)}-01`;
    const to = getTodayDate();

    setSelectedEmployee(null);
    setHistoryFromDate(from);
    setHistoryToDate(to);
    setHistoryRecords([]);
    setHistoryError("");
    setSelectedHistoryEmployee(employee);

    loadEmployeeHistory(from, to, employee.id);
  };

  // THỐNG KÊ RIÊNG NHÂN VIÊN
  const historySummary = useMemo(
    () => ({
      workDays: historyRecords.filter((record) => Boolean(record.checkIn))
        .length,
      lateCount: historyRecords.filter(
        (record) => Number(record.lateMinutes || 0) > 0
      ).length,
      lateMinutes: historyRecords.reduce(
        (sum, record) =>
          sum + Math.max(0, Number(record.lateMinutes || 0)),
        0
      ),
      earlyCount: historyRecords.filter(
        (record) => Number(record.earlyLeaveMinutes || 0) > 0
      ).length,
      earlyMinutes: historyRecords.reduce(
        (sum, record) =>
          sum + Math.max(0, Number(record.earlyLeaveMinutes || 0)),
        0
      ),
      checkedOut: historyRecords.filter((record) => Boolean(record.checkOut))
        .length,
    }),
    [historyRecords]
  );

  // MAP BẢN GHI CHẤM CÔNG THEO NHÂN VIÊN
  const recordMap = useMemo(() => {
    const map = new Map();

    data.records.forEach((record) => {
      const employeeId = String(
        record.employeeId?._id || record.employeeId || ""
      );

      if (employeeId) map.set(employeeId, record);
    });

    return map;
  }, [data.records]);

  // TÌM KIẾM NHÂN VIÊN
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

  // PHÂN TRANG
  const totalEmployeesFiltered = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployeesFiltered / pageSize);
  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (safeCurrentPage - 1) * pageSize;

  const displayedEmployees = useMemo(
    () => filteredEmployees.slice(startIndex, startIndex + pageSize),
    [filteredEmployees, startIndex, pageSize]
  );

  const displayedFrom =
    totalEmployeesFiltered === 0 ? 0 : startIndex + 1;
  const displayedTo = Math.min(
    startIndex + pageSize,
    totalEmployeesFiltered
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  // MỞ CÀI ĐẶT GIỜ LÀM VIỆC
  const openScheduleModal = () => {
    setError("");
    setMessage("");
    setScheduleForm({
      startTime: data.schedule.startTime || "08:30",
      endTime: data.schedule.endTime || "17:30",
    });
    setShowSchedule(true);
  };

  // LƯU GIỜ LÀM VIỆC
  const handleSaveSchedule = async (event) => {
    event.preventDefault();

    if (!scheduleForm.startTime || !scheduleForm.endTime) {
      setError("Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.");
      return;
    }

    if (scheduleForm.startTime >= scheduleForm.endTime) {
      setError("Giờ kết thúc phải lớn hơn giờ bắt đầu.");
      return;
    }

    setSavingSchedule(true);
    setError("");
    setMessage("");

    try {
      const result = await request("/attendance/schedule", {
        method: "PUT",
        body: JSON.stringify(scheduleForm),
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

      setMessage(
        `Cập nhật giờ làm việc thành công: ${nextSchedule.startTime} - ${nextSchedule.endTime}. Đã gửi thông báo cho ${result.notificationCount || 0} nhân viên. Lịch sử chấm công cũ được giữ nguyên.`
      );

      await loadAttendance(false);
    } catch (err) {
      setError(err.message || "Không thể cập nhật giờ làm việc.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const totalEmployees =
    Number(data.summary.total ?? data.employees.length ?? 0);

  const totalWorkDays = Number(data.summary.workDays || 0);
  const totalLateCount = Number(data.summary.lateCount || 0);
  const totalLateMinutes = Number(data.summary.lateMinutes || 0);

  return (
    <section className="manager-data-page">
      <div className="manager-data-card">
        {/* TIÊU ĐỀ */}
        <div className="manager-data-header">
          <div>
            <h1>Quản lý chấm công</h1>
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
              <RefreshCw size={16} />
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        {/* BỘ LỌC */}
        <div className="manager-toolbar">
          <div className="manager-date-filter">
            <CalendarDays size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="manager-search">
            <Search size={17} />
            <input
              type="text"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setCurrentPage(1);
              }}
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
                Ngày {formatDate(selectedDate)} · {filteredEmployees.length}{" "}
                nhân viên
              </p>
            </div>
          </div>

          <div className="responsive-table">
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Ngày chấm công</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Đi muộn</th>
                  <th>Về sớm</th>
                  <th>Trạng thái / Lịch sử</th>
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
                  displayedEmployees.map((employee) => {
                    const record = recordMap.get(String(employee.id));
                    const late = getStoredLateMinutes(record);
                    const early = getStoredEarlyLeaveMinutes(record);

                    return (
                      <tr
                        key={employee.id}
                        className="attendance-clickable-row"
                        onClick={() =>
                          setSelectedEmployee({
                            employee,
                            record:
                              recordMap.get(String(employee.id)) || null,
                          })
                        }
                        title="Nhấn để xem chi tiết chấm công"
                      >
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
                            : formatDate(selectedDate)}
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
                          <div className="attendance-status-actions">
                            <span
                              className={`status-badge ${
                                record?.checkIn
                                  ? record?.checkOut
                                    ? "approved"
                                    : "pending"
                                  : "pending"
                              }`}
                            >
                              {record?.checkIn
                                ? record?.checkOut
                                  ? "Đã chấm công"
                                  : "Đang làm việc"
                                : "Chưa chấm công"}
                            </span>

                            <button
                              type="button"
                              className="attendance-history-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEmployeeHistory(employee);
                              }}
                            >
                              <CalendarDays size={14} />
                              Lịch sử
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PHÂN TRANG */}
          {totalEmployeesFiltered > 0 && (
            <div className="payroll-pagination">
              <div className="payroll-pagination-info">
                Đang xem <strong>{displayedFrom}–{displayedTo}</strong> trên
                tổng <strong>{totalEmployeesFiltered}</strong> nhân viên
              </div>

              <div className="payroll-pagination-controls">
                <button
                  type="button"
                  className="payroll-page-btn"
                  disabled={safeCurrentPage === 1}
                  onClick={() => goToPage(safeCurrentPage - 1)}
                >
                  Trang trước
                </button>

                <div className="payroll-page-numbers">
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`payroll-page-number ${
                        safeCurrentPage === page ? "active" : ""
                      }`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="payroll-page-btn"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => goToPage(safeCurrentPage + 1)}
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT CHẤM CÔNG TRONG NGÀY */}
      {selectedEmployee && (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedEmployee(null);
            }
          }}
        >
          <div className="manager-modal attendance-detail-modal">
            <div className="manager-modal-heading">
              <div>
                <h3>Chi tiết chấm công</h3>
                <p>Thông tin chấm công ngày {formatDate(selectedDate)}</p>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="attendance-detail-employee">
              <div className="avatar">
                {(selectedEmployee.employee.name || "N")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <strong>{selectedEmployee.employee.name}</strong>
                <small>
                  {selectedEmployee.employee.employeeCode || "—"}
                </small>
                <small>
                  {selectedEmployee.employee.department || "—"}
                </small>
              </div>
            </div>

            {selectedEmployee.record ? (
              <>
                <div className="attendance-detail-grid">
                  <div>
                    <span>Giờ bắt đầu theo lịch</span>
                    <strong>
                      {selectedEmployee.record.scheduledStartTime ||
                        data.schedule.startTime}
                    </strong>
                  </div>

                  <div>
                    <span>Giờ kết thúc theo lịch</span>
                    <strong>
                      {selectedEmployee.record.scheduledEndTime ||
                        data.schedule.endTime}
                    </strong>
                  </div>

                  <div>
                    <span>Giờ chấm công vào</span>
                    <strong>
                      {selectedEmployee.record.checkIn || "Chưa chấm công"}
                    </strong>
                  </div>

                  <div>
                    <span>Giờ chấm công ra</span>
                    <strong>
                      {selectedEmployee.record.checkOut || "Chưa chấm công"}
                    </strong>
                  </div>

                  <div>
                    <span>Đi muộn</span>
                    <strong>
                      {formatNumber(selectedEmployee.record.lateMinutes)} phút
                    </strong>
                  </div>

                  <div>
                    <span>Về sớm</span>
                    <strong>
                      {formatNumber(
                        selectedEmployee.record.earlyLeaveMinutes
                      )}{" "}
                      phút
                    </strong>
                  </div>
                </div>

                <div className="attendance-detail-note">
                  <span>Ghi chú</span>
                  <p>
                    {selectedEmployee.record.note || "Không có ghi chú."}
                  </p>
                </div>
              </>
            ) : (
              <div className="empty-state">
                Nhân viên chưa có bản ghi chấm công trong ngày này.
              </div>
            )}

            <div className="manager-modal-actions">
              <button
                type="button"
                className="manager-action-button primary"
                onClick={() => setSelectedEmployee(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ CHẤM CÔNG RIÊNG TỪNG NHÂN VIÊN */}
      {selectedHistoryEmployee && (
        <div
          className="manager-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedHistoryEmployee(null);
            }
          }}
        >
          <div className="manager-modal attendance-employee-history-modal">
            <div className="manager-modal-heading">
              <div>
                <h3>Lịch sử chấm công</h3>
                <p>Lịch sử riêng của {selectedHistoryEmployee.name}</p>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                onClick={() => setSelectedHistoryEmployee(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="attendance-history-profile">
              <div className="avatar">
                {(selectedHistoryEmployee.name || "N")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <strong>{selectedHistoryEmployee.name}</strong>
                <small>
                  Mã nhân viên: {selectedHistoryEmployee.employeeCode || "—"}
                </small>
                <small>
                  Phòng ban: {selectedHistoryEmployee.department || "—"}
                </small>
              </div>
            </div>

            {/* BỘ LỌC NGÀY */}
            <div className="attendance-history-filter">
              <label>
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={historyFromDate}
                  onChange={(event) =>
                    setHistoryFromDate(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={historyToDate}
                  onChange={(event) => setHistoryToDate(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="manager-action-button primary"
                disabled={historyLoading}
                onClick={() => loadEmployeeHistory()}
              >
                <Search size={16} />
                {historyLoading ? "Đang lọc..." : "Lọc lịch sử"}
              </button>
            </div>

            {historyError && (
              <div className="manager-error-message">{historyError}</div>
            )}

            {/* THỐNG KÊ RIÊNG NHÂN VIÊN */}
            <div className="attendance-history-stats">
              <div className="attendance-history-stat blue">
                <span>Tổng công đã chấm</span>
                <strong>{formatNumber(historySummary.workDays)}</strong>
                <small>Lượt có chấm công vào</small>
              </div>

              <div className="attendance-history-stat orange">
                <span>Lượt đi muộn</span>
                <strong>{formatNumber(historySummary.lateCount)}</strong>
                <small>{formatNumber(historySummary.lateMinutes)} phút</small>
              </div>

              <div className="attendance-history-stat red">
                <span>Lượt về sớm</span>
                <strong>{formatNumber(historySummary.earlyCount)}</strong>
                <small>{formatNumber(historySummary.earlyMinutes)} phút</small>
              </div>

              <div className="attendance-history-stat green">
                <span>Đã chấm công ra</span>
                <strong>{formatNumber(historySummary.checkedOut)}</strong>
                <small>
                  Trên {formatNumber(historyRecords.length)} bản ghi
                </small>
              </div>
            </div>

            {/* BẢNG LỊCH SỬ */}
            <div className="attendance-history-table-wrapper">
              <table className="attendance-history-table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Giờ vào</th>
                    <th>Giờ ra</th>
                    <th>Đi muộn</th>
                    <th>Về sớm</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>

                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        Đang tải lịch sử chấm công...
                      </td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        Nhân viên chưa có dữ liệu chấm công trong khoảng thời
                        gian này.
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((record) => (
                      <tr key={record._id}>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.checkIn || "—"}</td>
                        <td>{record.checkOut || "—"}</td>

                        <td>
                          {Number(record.lateMinutes || 0) > 0 ? (
                            <span className="history-minute late">
                              {formatNumber(record.lateMinutes)} phút
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td>
                          {Number(record.earlyLeaveMinutes || 0) > 0 ? (
                            <span className="history-minute early">
                              {formatNumber(record.earlyLeaveMinutes)} phút
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              record.checkIn
                                ? record.checkOut
                                  ? "approved"
                                  : "pending"
                                : "rejected"
                            }`}
                          >
                            {record.checkIn
                              ? record.checkOut
                                ? "Đã chấm công"
                                : "Đang làm việc"
                              : "Chưa chấm công"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="attendance-history-footer">
              <span>
                Tổng cộng{" "}
                <strong>{formatNumber(historyRecords.length)}</strong> bản ghi
              </span>

              <button
                type="button"
                className="manager-action-button primary"
                onClick={() => setSelectedHistoryEmployee(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
          <form className="manager-modal" onSubmit={handleSaveSchedule}>
            <div className="manager-modal-heading">
              <div>
                <h3>Cài đặt giờ làm việc</h3>
                <p>
                  Giờ làm mới chỉ áp dụng cho các lượt chấm công phát sinh sau
                  khi lưu. Lịch sử cũ được giữ nguyên. Nhân viên sẽ nhận được
                  thông báo về thay đổi này.
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
                {savingSchedule ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
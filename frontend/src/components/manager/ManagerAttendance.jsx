import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Download,
  RefreshCw,
  Clock,
  Settings,
  Save,
  LoaderCircle,
} from "lucide-react";

import "./ManagerAttendance.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatDate = (date) => {
  if (!date) return "--";

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
};

const toMinutes = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const calculateLate = (checkIn, startTime) => {
  const actual = toMinutes(checkIn);
  const expected = toMinutes(startTime);

  if (actual === null || expected === null) return 0;

  return Math.max(0, actual - expected);
};

const getStatus = (record, startTime) => {
  if (!record?.checkIn) return "none";

  const late = calculateLate(record.checkIn, startTime);

  if (!record.checkOut) {
    return late > 0 ? "late-working" : "working";
  }

  return late > 0 ? "late" : "present";
};

const statusLabel = (status) =>
  ({
    present: "Đúng giờ",
    late: "Đi muộn",
    working: "Đang làm việc",
    "late-working": "Đang làm việc · Đi muộn",
    none: "Chưa chấm công",
  })[status] || "Chưa chấm công";

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại."
    );
  }

  const response = await fetch(`${API_URL}/api/attendance${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      data.message || "Bạn không có quyền truy cập chức năng này."
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Không thể thực hiện yêu cầu.");
  }

  return data;
}

const downloadCSV = (rows, filename) => {
  const csv = rows
    .map((row) =>
      row
        .map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        )
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

export default function ManagerAttendance() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);

  const [schedule, setSchedule] = useState({
    startTime: "08:30",
    endTime: "17:30",
  });

  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("17:30");

  const [month, setMonth] = useState(getToday().slice(0, 7));
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");

  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // TẢI DỮ LIỆU
  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      setError("");

      const data = await apiRequest(
        `/manager?month=${encodeURIComponent(month)}`
      );

      setEmployees(
        Array.isArray(data.employees) ? data.employees : []
      );

      setRecords(
        Array.isArray(data.records) ? data.records : []
      );

      const currentSchedule = data.schedule || {
        startTime: "08:30",
        endTime: "17:30",
      };

      setSchedule(currentSchedule);
      setStartTime(currentSchedule.startTime);
      setEndTime(currentSchedule.endTime);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu chấm công.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // LƯU GIỜ LÀM VIỆC
  const saveSchedule = async () => {
    if (saving) return;

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (start === null || end === null || end <= start) {
      setError(
        "Vui lòng nhập giờ hợp lệ và giờ kết thúc phải sau giờ bắt đầu."
      );

      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const data = await apiRequest("/schedule", {
        method: "PUT",
        body: JSON.stringify({
          startTime,
          endTime,
        }),
      });

      setSchedule(data.schedule);

      setMessage(
        data.message || "Đã cập nhật thời gian làm việc."
      );

      await loadData(false);
    } catch (err) {
      setError(err.message || "Không thể lưu thời gian làm việc.");
    } finally {
      setSaving(false);
    }
  };

  // LỌC DỮ LIỆU THEO THÁNG
  const monthRecords = useMemo(() => {
    return records.filter((record) =>
      record.date?.startsWith(month)
    );
  }, [records, month]);

  // TÍNH TOÁN DỮ LIỆU NHÂN VIÊN
  const rows = useMemo(() => {
    return employees
      .map((employee) => {
        const ownRecords = monthRecords.filter(
          (record) =>
            String(record.employeeId) === String(employee.id)
        );

        const lateRecords = ownRecords.filter(
          (record) =>
            calculateLate(
              record.checkIn,
              schedule.startTime
            ) > 0
        );

        const lateMinutes = ownRecords.reduce(
          (sum, record) =>
            sum +
            calculateLate(
              record.checkIn,
              schedule.startTime
            ),
          0
        );

        const latest = [...ownRecords].sort((a, b) =>
          (b.date || "").localeCompare(a.date || "")
        )[0];

        const status = getStatus(
          latest,
          schedule.startTime
        );

        return {
          ...employee,
          ownRecords,
          latest,
          status,

          workDays: ownRecords.filter(
            (record) => Boolean(record.checkIn)
          ).length,

          lateCount: lateRecords.length,
          lateMinutes,
        };
      })
      .filter((employee) => {
        const searchable =
          `${employee.name || ""} ${employee.employeeCode || ""} ${employee.department || ""}`.toLowerCase();

        const matchesKeyword = searchable.includes(
          keyword.trim().toLowerCase()
        );

        const matchesFilter =
          filter === "all" ||
          (filter === "late" && employee.lateCount > 0) ||
          (filter === "working" &&
            ["working", "late-working"].includes(
              employee.status
            )) ||
          (filter === "none" &&
            employee.status === "none");

        return matchesKeyword && matchesFilter;
      });
  }, [
    employees,
    monthRecords,
    keyword,
    filter,
    schedule.startTime,
  ]);

  // THỐNG KÊ
  const summary = useMemo(() => {
    const lateRecords = monthRecords.filter(
      (record) =>
        calculateLate(
          record.checkIn,
          schedule.startTime
        ) > 0
    );

    return {
      total: employees.length,

      workDays: monthRecords.filter(
        (record) => Boolean(record.checkIn)
      ).length,

      lateCount: lateRecords.length,

      lateMinutes: lateRecords.reduce(
        (sum, record) =>
          sum +
          calculateLate(
            record.checkIn,
            schedule.startTime
          ),
        0
      ),
    };
  }, [employees.length, monthRecords, schedule.startTime]);

  // LỊCH SỬ CHI TIẾT
  const selectedRecords = selected
    ? [...selected.ownRecords].sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      )
    : [];

  // XUẤT CSV
  const exportCSV = () => {
    const header = [
      "Ma nhan vien",
      "Nhan vien",
      "Phong ban",
      "Ngay",
      "Gio vao",
      "Gio ra",
      "So phut di muon",
      "So phut ve som",
      "Trang thai",
    ];

    const data = monthRecords.map((record) => {
      const employee = employees.find(
        (item) =>
          String(item.id) === String(record.employeeId)
      );

      const late = calculateLate(
        record.checkIn,
        schedule.startTime
      );

      return [
        record.employeeCode || employee?.employeeCode || "",
        record.employeeName || employee?.name || "",
        record.department || employee?.department || "",
        formatDate(record.date),
        record.checkIn || "",
        record.checkOut || "",
        late,
        Number(record.earlyLeaveMinutes) || 0,
        statusLabel(getStatus(record, schedule.startTime)),
      ];
    });

    downloadCSV(
      [header, ...data],
      `cham-cong-${month}.csv`
    );
  };

  return (
    <section className="manager-attendance">
      {/* TIÊU ĐỀ */}
      <div className="ma-page-heading">
        <div>
          <h1>Quản lý chấm công</h1>
          <p>
            Theo dõi thời gian làm việc của toàn bộ nhân viên.
          </p>
        </div>

        <button
          className="ma-btn"
          type="button"
          onClick={() => loadData()}
          disabled={loading}
        >
          <RefreshCw size={15} />
          Làm mới
        </button>
      </div>

      {/* THÔNG BÁO */}
      {error && (
        <div className="ma-alert ma-alert-error" role="alert">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {message && (
        <div className="ma-alert ma-alert-success" role="status">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      {/* THỐNG KÊ */}
      <div className="ma-summary">
        <div className="ma-stat">
          <div className="ma-stat-icon ma-blue">
            <Users size={20} />
          </div>

          <div>
            <span>Tổng nhân viên</span>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="ma-stat">
          <div className="ma-stat-icon ma-green">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Lượt chấm công</span>
            <strong>{summary.workDays}</strong>
          </div>
        </div>

        <div className="ma-stat">
          <div className="ma-stat-icon ma-orange">
            <AlertCircle size={20} />
          </div>

          <div>
            <span>Lượt đi muộn</span>
            <strong>{summary.lateCount}</strong>
          </div>
        </div>

        <div className="ma-stat">
          <div className="ma-stat-icon ma-purple">
            <Clock size={20} />
          </div>

          <div>
            <span>Tổng phút đi muộn</span>
            <strong>{summary.lateMinutes}</strong>
          </div>
        </div>
      </div>

      {/* CÀI ĐẶT GIỜ LÀM VIỆC */}
      <div className="ma-panel">
        <div className="ma-heading">
          <div>
            <h2>
              <Settings size={17} />
              Thiết lập thời gian làm việc
            </h2>

            <p>
              Thời gian này được sử dụng để tính đi muộn và về sớm.
            </p>
          </div>
        </div>

        <div className="ma-schedule">
          <div className="ma-field">
            <label htmlFor="ma-start-time">
              Giờ bắt đầu làm việc
            </label>

            <input
              id="ma-start-time"
              type="time"
              value={startTime}
              onChange={(event) =>
                setStartTime(event.target.value)
              }
            />
          </div>

          <div className="ma-field">
            <label htmlFor="ma-end-time">
              Giờ kết thúc làm việc
            </label>

            <input
              id="ma-end-time"
              type="time"
              value={endTime}
              onChange={(event) =>
                setEndTime(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="ma-btn ma-primary"
            onClick={saveSchedule}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle
                size={15}
                className="ma-spinner"
              />
            ) : (
              <Save size={15} />
            )}

            Lưu thời gian
          </button>
        </div>

        <p className="ma-schedule-note">
          Giờ làm việc hiện tại: {schedule.startTime} –{" "}
          {schedule.endTime}.
        </p>
      </div>

      {/* DANH SÁCH NHÂN VIÊN */}
      <div className="ma-panel">
        <div className="ma-heading">
          <div>
            <h2>Danh sách chấm công nhân viên</h2>
            <p>
              Thông tin ngày công và thời gian làm việc.
            </p>
          </div>

          <span className="ma-total">
            {rows.length} nhân viên
          </span>
        </div>

        {/* TÌM KIẾM VÀ LỌC */}
        <div className="ma-toolbar">
          <label className="ma-search">
            <Search size={17} />

            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
              placeholder="Tìm tên, mã nhân viên, phòng ban..."
            />
          </label>

          <div className="ma-filters">
            <input
              className="ma-input"
              type="month"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value)
              }
              aria-label="Chọn tháng"
            />

            <select
              className="ma-select"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              aria-label="Lọc trạng thái chấm công"
            >
              <option value="all">Tất cả</option>
              <option value="late">Có đi muộn</option>
              <option value="working">Đang làm việc</option>
              <option value="none">Chưa chấm công</option>
            </select>

            <button
              className="ma-btn"
              type="button"
              onClick={exportCSV}
            >
              <Download size={15} />
              Xuất CSV
            </button>
          </div>
        </div>

        {/* BẢNG CHẤM CÔNG */}
        <div className="ma-table-wrap">
          <table className="ma-table">
            <thead>
              <tr>
                <th>NHÂN VIÊN</th>
                <th>PHÒNG BAN</th>
                <th>NGÀY CÔNG</th>
                <th>SỐ LẦN MUỘN</th>
                <th>TỔNG PHÚT MUỘN</th>
                <th>CHẤM CÔNG GẦN NHẤT</th>
                <th>TRẠNG THÁI</th>
                <th>CHI TIẾT</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="ma-empty">
                    <LoaderCircle
                      className="ma-spinner"
                      size={22}
                    />
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="ma-empty">
                    Không tìm thấy nhân viên.
                  </td>
                </tr>
              ) : (
                rows.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="ma-employee">
                        <div className="ma-avatar">
                          {employee.name
                            ?.charAt(0)
                            .toUpperCase() || "N"}
                        </div>

                        <div>
                          <strong>{employee.name}</strong>
                          <small>
                            {employee.employeeCode || "Chưa có mã"}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>{employee.department || "--"}</td>

                    <td>{employee.workDays}</td>

                    <td>{employee.lateCount} lần</td>

                    <td
                      className={
                        employee.lateMinutes > 0
                          ? "ma-late-text"
                          : ""
                      }
                    >
                      {employee.lateMinutes} phút
                    </td>

                    <td>
                      {employee.latest
                        ? `${formatDate(employee.latest.date)} · ${
                            employee.latest.checkIn || "--:--"
                          } / ${
                            employee.latest.checkOut || "--:--"
                          }`
                        : "Chưa có dữ liệu"}
                    </td>

                    <td>
                      <span
                        className={`ma-status ${employee.status}`}
                      >
                        {statusLabel(employee.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        className="ma-view"
                        type="button"
                        title="Xem chi tiết"
                        onClick={() => setSelected(employee)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ma-count">
          Hiển thị {rows.length}/{employees.length} nhân viên ·
          Tháng {month}
        </div>
      </div>

      {/* MODAL CHI TIẾT */}
      {selected && (
        <div
          className="ma-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <div
            className="ma-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ma-modal-title"
          >
            <div className="ma-modal-head">
              <div>
                <h2 id="ma-modal-title">{selected.name}</h2>

                <p>
                  {selected.employeeCode} · {selected.department} ·
                  Tháng {month}
                </p>
              </div>

              <button
                className="ma-close"
                type="button"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ma-detail-grid">
              <div className="ma-detail-box">
                <span>Ngày công</span>
                <strong>{selected.workDays}</strong>
              </div>

              <div className="ma-detail-box">
                <span>Số lần muộn</span>
                <strong>{selected.lateCount}</strong>
              </div>

              <div className="ma-detail-box">
                <span>Tổng phút muộn</span>
                <strong>{selected.lateMinutes}</strong>
              </div>

              <div className="ma-detail-box">
                <span>Giờ làm việc</span>

                <strong className="ma-detail-time">
                  {schedule.startTime} – {schedule.endTime}
                </strong>
              </div>
            </div>

            <div className="ma-table-wrap">
              <table className="ma-table ma-detail-table">
                <thead>
                  <tr>
                    <th>NGÀY</th>
                    <th>GIỜ VÀO</th>
                    <th>GIỜ RA</th>
                    <th>ĐI MUỘN</th>
                    <th>VỀ SỚM</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="ma-empty">
                        Chưa có dữ liệu chấm công.
                      </td>
                    </tr>
                  ) : (
                    selectedRecords.map((record) => {
                      const late = calculateLate(
                        record.checkIn,
                        schedule.startTime
                      );

                      const status = getStatus(
                        record,
                        schedule.startTime
                      );

                      return (
                        <tr key={record._id || record.date}>
                          <td>{formatDate(record.date)}</td>

                          <td>{record.checkIn || "--:--"}</td>

                          <td>{record.checkOut || "--:--"}</td>

                          <td>{late} phút</td>

                          <td>
                            {Number(record.earlyLeaveMinutes) || 0} phút
                          </td>

                          <td>
                            <span className={`ma-status ${status}`}>
                              {statusLabel(status)}
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
        </div>
      )}
    </section>
  );
}
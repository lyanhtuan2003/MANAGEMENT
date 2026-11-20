
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import "./Attendance.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE = RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_URL = `${API_BASE}/api/attendance`;

// ========================================
// TIỆN ÍCH
// ========================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getVietnamToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const formatDate = (date) => {
  if (!date) return "--";

  const value = String(date).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  return "--";
};

const toMinutes = (time) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const calculateLate = (checkIn, startTime) => {
  const actual = toMinutes(checkIn);
  const expected = toMinutes(startTime);

  if (actual === null || expected === null) {
    return 0;
  }

  return Math.max(0, actual - expected);
};

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

// ========================================
// API REQUEST
// ========================================

async function request(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error(
      "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
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
      data.message ||
        `Không thể thực hiện yêu cầu (${response.status}).`
    );
  }

  return data;
}

// ========================================
// COMPONENT CHẤM CÔNG
// ========================================

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);

  const [schedule, setSchedule] = useState({
    startTime: "08:30",
    endTime: "17:30",
  });

  const [month, setMonth] = useState(
    getVietnamToday().slice(0, 7)
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const user = useMemo(() => readUser(), []);

  // ========================================
  // TẢI DỮ LIỆU
  // ========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await request(
        `/me?month=${encodeURIComponent(month)}`
      );

      setRecords(
        Array.isArray(data.records) ? data.records : []
      );

      setTodayRecord(data.todayRecord || null);

      if (data.schedule) {
        setSchedule((previous) => ({
          ...previous,
          ...data.schedule,
        }));
      }
    } catch (err) {
      console.error("Load attendance error:", err);

      setError(
        err.message || "Không thể tải dữ liệu chấm công."
      );
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // TRẠNG THÁI HÔM NAY
  // ========================================

  const checkedIn = Boolean(
    todayRecord?.checkIn || todayRecord?.checkInTime
  );

  const checkedOut = Boolean(
    todayRecord?.checkOut || todayRecord?.checkOutTime
  );

  const todayCheckIn =
    todayRecord?.checkIn ||
    todayRecord?.checkInTime ||
    "--:--";

  const todayCheckOut =
    todayRecord?.checkOut ||
    todayRecord?.checkOutTime ||
    "--:--";

  const lateMinutes = Number.isFinite(
    Number(todayRecord?.lateMinutes)
  )
    ? Number(todayRecord?.lateMinutes)
    : calculateLate(todayCheckIn, schedule.startTime);

  const earlyLeaveMinutes =
    Number(todayRecord?.earlyLeaveMinutes) || 0;

  // ========================================
  // CHẤM CÔNG VÀO / RA
  // ========================================

  const handleAttendance = async (type) => {
    if (submitting || loading) return;

    if (type === "check-in" && checkedIn) return;

    if (type === "check-out" && (!checkedIn || checkedOut)) {
      return;
    }

    try {
      setSubmitting(type);
      setError("");
      setMessage("");

      const data = await request(
        type === "check-in" ? "/check-in" : "/check-out",
        {
          method: type === "check-in" ? "POST" : "PATCH",
        }
      );

      setMessage(data.message || "Chấm công thành công.");

      await loadData();
    } catch (err) {
      console.error("Attendance action error:", err);

      setError(
        err.message || "Không thể thực hiện chấm công."
      );

      await loadData();
    } finally {
      setSubmitting("");
    }
  };

  // ========================================
  // LỊCH SỬ CHẤM CÔNG
  // ========================================

  const history = useMemo(() => {
    return [...records].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
  }, [records]);

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="employee-page attendance-page">

      {/* TIÊU ĐỀ */}
      <div className="employee-section-title">
        <h1>Chấm công</h1>
        <p>
          Xin chào {user.name || "nhân viên"}, theo dõi thời gian
          làm việc của bạn tại đây.
        </p>
      </div>

      {/* THÔNG BÁO LỖI */}
      {error && (
        <div className="attendance-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* THÔNG BÁO THÀNH CÔNG */}
      {message && (
        <div className="attendance-alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* CHẤM CÔNG HÔM NAY */}
      <section className="employee-panel attendance-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Chấm công hôm nay</h2>
            <p>Ghi nhận giờ vào và giờ ra của bạn.</p>
          </div>

          <Clock color="#3986e8" size={25} />
        </div>

        {/* GIỜ LÀM VIỆC */}
        <div className="attendance-schedule-info">
          <span>
            <strong>Giờ bắt đầu:</strong>{" "}
            {schedule.startTime}
          </span>

          <span>
            <strong>Giờ kết thúc:</strong>{" "}
            {schedule.endTime}
          </span>
        </div>

        {/* GIỜ VÀO / RA */}
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

        {/* TRẠNG THÁI ĐI MUỘN */}
        {checkedIn && (
          <div
            className={`attendance-alert ${
              lateMinutes > 0 ? "warning" : "success"
            }`}
          >
            {lateMinutes > 0 ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}

            <span>
              {lateMinutes > 0
                ? `Bạn đã đi muộn ${lateMinutes} phút.`
                : "Bạn đã chấm công đúng giờ."}
            </span>
          </div>
        )}

        {/* TRẠNG THÁI VỀ SỚM */}
        {checkedOut && earlyLeaveMinutes > 0 && (
          <div className="attendance-alert warning">
            <AlertCircle size={18} />
            <span>
              Bạn đã về sớm {earlyLeaveMinutes} phút.
            </span>
          </div>
        )}

        {/* NÚT CHẤM CÔNG */}
        <div className="attendance-actions">
          <button
            type="button"
            className="attendance-button check-in-button"
            disabled={loading || Boolean(submitting) || checkedIn}
            onClick={() => handleAttendance("check-in")}
          >
            {submitting === "check-in" ? (
              <LoaderCircle
                className="attendance-spinner"
                size={18}
              />
            ) : (
              <CheckCircle2 size={18} />
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
              <LoaderCircle
                className="attendance-spinner"
                size={18}
              />
            ) : (
              <Clock size={18} />
            )}

            {checkedOut
              ? "Đã chấm công ra"
              : "Chấm công ra"}
          </button>
        </div>

        {loading && (
          <p className="attendance-loading">
            Đang tải dữ liệu chấm công...
          </p>
        )}
      </section>

      {/* LỊCH SỬ CHẤM CÔNG */}
      <section className="employee-panel attendance-history-panel">
        <div className="attendance-history-heading">
          <div className="attendance-history-title">
            <h2>Lịch sử chấm công</h2>
            <p>Danh sách các lần chấm công theo tháng.</p>
          </div>

          {/* CHỌN THÁNG VÀ LÀM MỚI */}
          <div className="attendance-history-tools">
            <div className="attendance-month-wrapper">
              <CalendarDays
                size={17}
                className="attendance-month-icon"
              />

              <input
                type="month"
                aria-label="Chọn tháng chấm công"
                className="attendance-month-input"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="attendance-refresh"
              onClick={loadData}
              disabled={loading}
              title="Làm mới dữ liệu"
              aria-label="Làm mới dữ liệu"
            >
              <RefreshCw
                size={17}
                className={
                  loading ? "attendance-refresh-spinning" : ""
                }
              />
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="employee-table-scroll">
          <table className="employee-table">
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
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" className="attendance-empty">
                    <CalendarDays size={25} />
                    <p>
                      {loading
                        ? "Đang tải dữ liệu..."
                        : "Chưa có lịch sử chấm công."}
                    </p>
                  </td>
                </tr>
              ) : (
                history.map((item) => {
                  const late = Number.isFinite(
                    Number(item.lateMinutes)
                  )
                    ? Number(item.lateMinutes)
                    : calculateLate(
                        item.checkIn,
                        schedule.startTime
                      );

                  const early =
                    Number(item.earlyLeaveMinutes) || 0;

                  const hasCheckIn = Boolean(item.checkIn);
                  const hasCheckOut = Boolean(item.checkOut);

                  const status = !hasCheckIn
                    ? "Chưa chấm công"
                    : !hasCheckOut
                    ? "Đang làm việc"
                    : late > 0
                    ? "Đi muộn"
                    : "Đúng giờ";

                  const statusClass = !hasCheckIn
                    ? "none"
                    : !hasCheckOut
                    ? "working"
                    : late > 0
                    ? "late"
                    : "present";

                  return (
                    <tr key={item._id || item.date}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.checkIn || "--:--"}</td>
                      <td>{item.checkOut || "--:--"}</td>
                      <td>
                        <span
                          className={
                            late > 0 ? "attendance-late" : ""
                          }
                        >
                          {late} phút
                        </span>
                      </td>
                      <td>{early} phút</td>
                      <td>
                        <span
                          className={`attendance-status ${statusClass}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST */}
        <div className="attendance-mobile-list">
          {history.length === 0 ? (
            <div className="attendance-mobile-empty">
              <CalendarDays size={28} />
              <p>
                {loading
                  ? "Đang tải dữ liệu..."
                  : "Chưa có lịch sử chấm công."}
              </p>
            </div>
          ) : (
            history.map((item) => {
              const late = Number.isFinite(
                Number(item.lateMinutes)
              )
                ? Number(item.lateMinutes)
                : calculateLate(
                    item.checkIn,
                    schedule.startTime
                  );

              const early =
                Number(item.earlyLeaveMinutes) || 0;

              const hasCheckIn = Boolean(item.checkIn);
              const hasCheckOut = Boolean(item.checkOut);

              const status = !hasCheckIn
                ? "Chưa chấm công"
                : !hasCheckOut
                ? "Đang làm việc"
                : late > 0
                ? "Đi muộn"
                : "Đúng giờ";

              const statusClass = !hasCheckIn
                ? "none"
                : !hasCheckOut
                ? "working"
                : late > 0
                ? "late"
                : "present";

              return (
                <article
                  className="attendance-mobile-card"
                  key={item._id || item.date}
                >
                  <div className="attendance-mobile-card-head">
                    <div className="attendance-mobile-date">
                      <CalendarDays size={15} />
                      <strong>{formatDate(item.date)}</strong>
                    </div>

                    <span
                      className={`attendance-status ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="attendance-mobile-details">
                    <div className="attendance-mobile-detail">
                      <span>Giờ vào</span>
                      <strong>{item.checkIn || "--:--"}</strong>
                    </div>

                    <div className="attendance-mobile-detail">
                      <span>Giờ ra</span>
                      <strong>{item.checkOut || "--:--"}</strong>
                    </div>

                    <div className="attendance-mobile-detail">
                      <span>Đi muộn</span>
                      <strong
                        className={
                          late > 0 ? "attendance-late" : ""
                        }
                      >
                        {late} phút
                      </strong>
                    </div>

                    <div className="attendance-mobile-detail">
                      <span>Về sớm</span>
                      <strong>{early} phút</strong>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

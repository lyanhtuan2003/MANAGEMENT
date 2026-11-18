
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  Gift,
  CircleDollarSign,
  Search,
  Eye,
  X,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./ManagerPayroll.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getCurrentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function ManagerPayroll() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const apiRequest = async (url) => {
    const token = getToken();

    if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");

    const response = await fetch(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Không thể tải dữ liệu.");
    }

    return data;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/payroll/manager?month=${Number(month.slice(5))}&year=${Number(month.slice(0, 4))}`
      );

      setRows(data.payrolls || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = async (item) => {
    try {
      setSelected(item);
      setDetail(null);
      setDetailLoading(true);

      const data = await apiRequest(
        `/payroll/manager/${item.employee._id}/detail?month=${month}`
      );

      setDetail(data);
    } catch (err) {
      alert(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredRows = rows.filter((item) => {
    const employee = item.employee || {};
    const search = keyword.trim().toLowerCase();

    if (!search) return true;

    return [
      employee.name,
      employee.employeeCode,
      employee.department,
      employee.position,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });

  return (
    <div className="manager-payroll-page">
      <div className="manager-payroll-heading">
        <div>
          <span className="manager-payroll-eyebrow">PAYROLL MANAGEMENT</span>
          <h1>Quản lý bảng lương</h1>
          <p>Theo dõi ngày công, tiền thưởng và tiền phạt của nhân viên.</p>
        </div>

        <label className="manager-payroll-month">
          <CalendarDays size={18} />
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
      </div>

      <div className="manager-payroll-stats">
        <div className="manager-payroll-stat">
          <Users />
          <span>Tổng nhân viên</span>
          <strong>{summary.employeeCount || 0}</strong>
        </div>

        <div className="manager-payroll-stat">
          <CalendarDays />
          <span>Tổng ngày công</span>
          <strong>{summary.totalWorkDays || 0}</strong>
        </div>

        <div className="manager-payroll-stat">
          <Gift />
          <span>Tổng tiền thưởng</span>
          <strong>{money(summary.totalBonus)}</strong>
        </div>

        <div className="manager-payroll-stat">
          <CircleDollarSign />
          <span>Tổng tiền phạt</span>
          <strong>{money(summary.totalPenalty)}</strong>
        </div>
      </div>

      <section className="manager-payroll-panel">
        <div className="manager-payroll-panel-heading">
          <div>
            <h2>Danh sách nhân viên</h2>
            <p>Tháng {month.slice(5)}/{month.slice(0, 4)}</p>
          </div>

          <div className="manager-payroll-search">
            <Search size={17} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm nhân viên..."
            />
          </div>
        </div>

        {error && <div className="manager-payroll-error">{error}</div>}

        {loading ? (
          <div className="manager-payroll-empty">Đang tải dữ liệu...</div>
        ) : (
          <div className="manager-payroll-table-wrap">
            <table className="manager-payroll-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Tổng công</th>
                  <th>Đi muộn</th>
                  <th>Về sớm</th>
                  <th>Thưởng</th>
                  <th>Phạt</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="manager-payroll-empty">
                      Không có dữ liệu nhân viên.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item) => (
                    <tr key={item.employee._id}>
                      <td>
                        <strong>{item.employee.name}</strong>
                        <small>{item.employee.employeeCode || "Chưa có mã"}</small>
                      </td>
                      <td>{item.employee.department || "—"}</td>
                      <td>{item.attendance.workDays} ngày</td>
                      <td>
                        {item.attendance.lateCount} lần
                        <small>{item.attendance.lateMinutes} phút</small>
                      </td>
                      <td>
                        {item.attendance.earlyLeaveCount} lần
                        <small>{item.attendance.earlyLeaveMinutes} phút</small>
                      </td>
                      <td className="positive">{money(item.bonus)}</td>
                      <td className="negative">{money(item.penalty)}</td>
                      <td>
                        <button
                          type="button"
                          className="manager-payroll-detail-button"
                          onClick={() => openDetail(item)}
                        >
                          <Eye size={15} /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div
          className="manager-payroll-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
              setDetail(null);
            }
          }}
        >
          <div className="manager-payroll-modal">
            <div className="manager-payroll-modal-header">
              <div>
                <span>CHI TIẾT NHÂN VIÊN</span>
                <h2>{selected.employee.name}</h2>
                <p>{selected.employee.employeeCode} · {month}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setDetail(null);
                }}
              >
                <X />
              </button>
            </div>

            {detailLoading ? (
              <div className="manager-payroll-empty">Đang tải chi tiết...</div>
            ) : detail ? (
              <>
                <div className="manager-payroll-detail-stats">
                  <div>
                    <span>Tổng ngày công</span>
                    <strong>{detail.summary.workDays}</strong>
                  </div>
                  <div>
                    <span>Số lần đi muộn</span>
                    <strong>{detail.summary.lateCount}</strong>
                  </div>
                  <div>
                    <span>Số lần về sớm</span>
                    <strong>{detail.summary.earlyLeaveCount}</strong>
                  </div>
                </div>

                <section className="manager-payroll-detail-section">
                  <h3>Chi tiết chấm công từng ngày</h3>

                  {detail.attendance.length === 0 ? (
                    <p className="manager-payroll-empty">Chưa có dữ liệu chấm công.</p>
                  ) : (
                    <div className="manager-payroll-detail-list">
                      {detail.attendance.map((record) => (
                        <div className="manager-payroll-day" key={record._id}>
                          <div>
                            <strong>{record.date}</strong>
                            <small>{record.note || "Không có ghi chú"}</small>
                          </div>

                          <div className="manager-payroll-times">
                            <span><LogIn size={14} /> {record.checkIn || "--:--"}</span>
                            <span><LogOut size={14} /> {record.checkOut || "--:--"}</span>
                          </div>

                          <div className="manager-payroll-day-status">
                            {record.lateMinutes > 0 && (
                              <span className="late">Muộn {record.lateMinutes} phút</span>
                            )}

                            {record.earlyLeaveMinutes > 0 && (
                              <span className="early">Sớm {record.earlyLeaveMinutes} phút</span>
                            )}

                            {record.checkIn &&
                              record.checkOut &&
                              !record.lateMinutes &&
                              !record.earlyLeaveMinutes && (
                                <span className="ontime"><CheckCircle2 size={13} /> Đúng giờ</span>
                              )}

                            {!record.checkIn && (
                              <span className="late"><AlertCircle size={13} /> Chưa chấm công</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="manager-payroll-detail-section">
                  <h3>Lịch sử thưởng và phạt</h3>

                  <div className="manager-payroll-reward-totals">
                    <div>
                      <span>Tổng thưởng</span>
                      <strong className="positive">{money(detail.summary.totalBonus)}</strong>
                    </div>
                    <div>
                      <span>Tổng phạt</span>
                      <strong className="negative">{money(detail.summary.totalPenalty)}</strong>
                    </div>
                  </div>

                  {detail.rewards.length === 0 ? (
                    <p className="manager-payroll-empty">Chưa có quyết định thưởng/phạt.</p>
                  ) : (
                    detail.rewards.map((record) => (
                      <div className="manager-payroll-reward" key={record._id}>
                        <div>
                          <strong>{record.reason}</strong>
                          <small>
                            {new Date(record.date).toLocaleDateString("vi-VN")}
                          </small>
                        </div>

                        <strong className={record.type === "Thưởng" ? "positive" : "negative"}>
                          {record.type === "Thưởng" ? "+" : "-"}{money(record.amount)}
                        </strong>
                      </div>
                    ))
                  )}
                </section>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

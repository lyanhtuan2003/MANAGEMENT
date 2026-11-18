
import { useEffect, useState } from "react";
import {
  Wallet,
  CalendarDays,
  TrendingUp,
  Gift,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./Payroll.css";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

export default function Payroll() {
  const now = new Date();

  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          throw new Error("Phiên đăng nhập đã hết hạn.");
        }

        const response = await fetch(
          `${API_URL}/payroll/me?month=${month}&year=${year}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Không thể tải bảng lương.");
        }

        setPayrolls(data.payrolls || []);
      } catch (err) {
        setError(err.message);
        setPayrolls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [month, year]);

  const payroll = payrolls[0] || null;

  return (
    <div className="employee-payroll-page">
      <div className="employee-payroll-heading">
        <div>
          <h1>Bảng lương của tôi</h1>
          <p>Thông tin thu nhập và các khoản khấu trừ.</p>
        </div>

        <div className="employee-payroll-filter">
          <CalendarDays size={18} />

          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                Tháng {index + 1}
              </option>
            ))}
          </select>

          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {Array.from(
              { length: 6 },
              (_, index) => now.getFullYear() - index
            ).map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="employee-payroll-message">Đang tải bảng lương...</div>
      ) : error ? (
        <div className="employee-payroll-message error">{error}</div>
      ) : !payroll ? (
        <div className="employee-payroll-message">
          Chưa có bảng lương tháng {month}/{year}.
        </div>
      ) : (
        <>
          <section className="employee-payroll-highlight">
            <div className="employee-payroll-highlight-icon">
              <Wallet size={25} />
            </div>

            <span>THỰC NHẬN THÁNG {month}/{year}</span>
            <h2>{money(payroll.totalSalary)}</h2>

            <div className={`employee-payroll-status ${payroll.status}`}>
              {payroll.status === "paid" ? (
                <>
                  <CheckCircle2 size={15} /> Đã thanh toán
                </>
              ) : (
                <>
                  <Clock size={15} /> Chưa thanh toán
                </>
              )}
            </div>
          </section>

          <section className="employee-payroll-card">
            <div className="employee-payroll-card-heading">
              <div>
                <h2>Chi tiết thu nhập</h2>
                <p>Tháng {month}/{year}</p>
              </div>
            </div>

            <div className="employee-payroll-list">
              <div>
                <span>Lương cơ bản</span>
                <strong>{money(payroll.basicSalary)}</strong>
              </div>

              <div>
                <span>Phụ cấp</span>
                <strong className="positive">
                  +{money(payroll.allowance)}
                </strong>
              </div>

              <div>
                <span>Tiền thưởng</span>
                <strong className="positive">
                  +{money(payroll.bonus)}
                </strong>
              </div>

              <div>
                <span>Khoản khấu trừ</span>
                <strong className="negative">
                  -{money(payroll.deduction)}
                </strong>
              </div>

              <div className="employee-payroll-final">
                <span>Thực nhận</span>
                <strong>{money(payroll.totalSalary)}</strong>
              </div>
            </div>

            {payroll.note && (
              <div className="employee-payroll-note">
                <strong>Ghi chú của quản lý</strong>
                <p>{payroll.note}</p>
              </div>
            )}
          </section>

          <div className="employee-payroll-footnote">
            <AlertCircle size={16} />
            <span>
              Tiền thưởng và tiền phạt được tổng hợp theo quyết định thưởng/phạt.
              Các khoản khấu trừ khác do quản lý nhập.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

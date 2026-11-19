
import { useEffect, useState } from "react";
import {
  Wallet,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./Payroll.css";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

export default function Payroll() {
  const now = new Date();

  const [month, setMonth] = useState(
    String(now.getMonth() + 1)
  );

  const [year, setYear] = useState(
    String(now.getFullYear())
  );

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchPayroll = async () => {
      try {
        setLoading(true);
        setError("");
        setPayroll(null);

        const token = getToken();

        if (!token) {
          throw new Error(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          );
        }

        const params = new URLSearchParams({
          month: String(Number(month)),
          year: String(Number(year)),
        });

        const response = await fetch(
          `${API_URL}/payroll/me?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Không thể tải bảng lương."
          );
        }

        if (controller.signal.aborted) return;

        const payrollData = Array.isArray(data.payrolls)
          ? data.payrolls[0] || null
          : null;

        // Chỉ hiển thị bảng lương đúng tháng/năm đang chọn.
        if (
          payrollData &&
          (
            Number(payrollData.month) !== Number(month) ||
            Number(payrollData.year) !== Number(year)
          )
        ) {
          setPayroll(null);
          return;
        }

        setPayroll(payrollData);
      } catch (err) {
        if (err.name === "AbortError") return;

        setError(
          err.message || "Có lỗi xảy ra khi tải bảng lương."
        );
        setPayroll(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPayroll();

    return () => {
      controller.abort();
    };
  }, [month, year]);

  const isPaid = payroll?.status === "paid";

  return (
    <div className="employee-payroll-page">
      <div className="employee-payroll-heading">
        <div>
          <h1>Bảng lương của tôi</h1>
          <p>
            Thông tin thu nhập và các khoản khấu trừ.
          </p>
        </div>

        <div className="employee-payroll-filter">
          <CalendarDays size={19} />

          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option
                key={index + 1}
                value={String(index + 1)}
              >
                Tháng {index + 1}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {Array.from(
              { length: 6 },
              (_, index) => now.getFullYear() - index
            ).map((value) => (
              <option
                key={value}
                value={String(value)}
              >
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="employee-payroll-message">
          Đang tải bảng lương...
        </div>
      ) : error ? (
        <div className="employee-payroll-message error">
          <AlertCircle size={18} />
          {error}
        </div>
      ) : !payroll ? (
        <div className="employee-payroll-message">
          Chưa có bảng lương tháng {month}/{year}.
        </div>
      ) : (
        <>
          <section className="employee-payroll-highlight">
            <div className="employee-payroll-highlight-icon">
              <Wallet size={27} />
            </div>

            <span>
              THỰC NHẬN THÁNG {month}/{year}
            </span>

            <h2>{money(payroll.totalSalary)}</h2>

            <div
              className={`employee-payroll-status ${
                isPaid ? "paid" : "draft"
              }`}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 size={16} />
                  Đã thanh toán
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Chưa thanh toán
                </>
              )}
            </div>
          </section>

          <section className="employee-payroll-card">
            <div className="employee-payroll-card-heading">
              <div>
                <h2>Chi tiết thu nhập</h2>
                <p>
                  Bảng lương tháng {month}/{year}
                </p>
              </div>
            </div>

            <div className="employee-payroll-list">
              <div>
                <span>Lương cơ bản</span>
                <strong>
                  {money(payroll.basicSalary)}
                </strong>
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
                <span>Tiền phạt</span>
                <strong className="negative">
                  -{money(payroll.penalty)}
                </strong>
              </div>

              <div>
                <span>Khấu trừ bổ sung</span>
                <strong className="negative">
                  -{money(payroll.additionalDeduction)}
                </strong>
              </div>

              <div className="employee-payroll-final">
                <span>Thực nhận</span>
                <strong>
                  {money(payroll.totalSalary)}
                </strong>
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
            <AlertCircle size={17} />
            <span>
              Lương cơ bản được tính đủ theo tháng.
              Ngày công chỉ dùng để theo dõi, không dùng
              để chia lương. Thực nhận = Lương cơ bản
              + Phụ cấp + Thưởng - Phạt - Khấu trừ bổ sung.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

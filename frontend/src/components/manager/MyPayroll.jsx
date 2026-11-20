
import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  CalendarDays,
  RefreshCw,
  CircleCheck,
  Clock3,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  UserRound,
} from "lucide-react";

import "./MyPayroll.css";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const now = new Date();

export default function MyPayroll() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMyPayroll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setPayroll(null);

      const token = getToken();

      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });

      const response = await fetch(
        `${API_URL}/payroll/me?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new Error("Phiên đăng nhập đã hết hạn.");
      }

      if (response.status === 403) {
        throw new Error("Bạn không có quyền xem bảng lương này.");
      }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Không thể tải bảng lương."
        );
      }

      const payrollList = Array.isArray(result.payrolls)
        ? result.payrolls
        : [];

      setPayroll(payrollList[0] || null);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi tải bảng lương.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadMyPayroll();
  }, [loadMyPayroll]);

  const basicSalary = Number(payroll?.basicSalary || 0);
  const allowance = Number(payroll?.allowance || 0);
  const bonus = Number(payroll?.bonus || 0);
  const penalty = Number(payroll?.penalty || 0);
  const additionalDeduction = Number(
    payroll?.additionalDeduction || 0
  );

  const totalSalary = Number(payroll?.totalSalary || 0);

  const isPaid = payroll?.status === "paid";

  const detailItems = [
    {
      label: "Lương cơ bản",
      value: basicSalary,
      type: "normal",
      icon: Wallet,
    },
    {
      label: "Phụ cấp",
      value: allowance,
      type: "plus",
      icon: TrendingUp,
    },
    {
      label: "Thưởng",
      value: bonus,
      type: "plus",
      icon: TrendingUp,
    },
    {
      label: "Tiền phạt",
      value: penalty,
      type: "minus",
      icon: TrendingDown,
    },
    {
      label: "Khấu trừ bổ sung",
      value: additionalDeduction,
      type: "minus",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="my-payroll-page">
      {/* HEADER */}
      <div className="my-payroll-heading">
        <div className="my-payroll-heading-left">
          <div className="my-payroll-heading-icon">
            <Wallet size={24} />
          </div>

          <div>
            <h2>Bảng lương của tôi</h2>
            <p>
              Theo dõi thu nhập và tình trạng thanh toán cá nhân.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="my-payroll-refresh"
          onClick={loadMyPayroll}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "my-payroll-spin" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* CHỌN THÁNG */}
      <section className="my-payroll-filter">
        <div className="my-payroll-filter-label">
          <CalendarDays size={19} />
          <strong>Chọn kỳ lương</strong>
        </div>

        <div className="my-payroll-filter-controls">
          <select
            value={month}
            onChange={(event) =>
              setMonth(Number(event.target.value))
            }
            aria-label="Chọn tháng"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (item) => (
                <option key={item} value={item}>
                  Tháng {item}
                </option>
              )
            )}
          </select>

          <select
            value={year}
            onChange={(event) =>
              setYear(Number(event.target.value))
            }
            aria-label="Chọn năm"
          >
            {Array.from(
              { length: 7 },
              (_, index) => now.getFullYear() - 3 + index
            ).map((item) => (
              <option key={item} value={item}>
                Năm {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="my-payroll-state">
          <RefreshCw size={27} className="my-payroll-spin" />
          <span>Đang tải bảng lương...</span>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="my-payroll-error">
          {error}
        </div>
      )}

      {/* EMPTY */}
      {!loading && !error && !payroll && (
        <div className="my-payroll-empty">
          <div className="my-payroll-empty-icon">
            <ReceiptText size={34} />
          </div>

          <h3>Chưa có bảng lương</h3>

          <p>
            Chưa có bảng lương tháng {month}/{year}.
            Vui lòng liên hệ quản lý để được hỗ trợ.
          </p>

          <button
            type="button"
            onClick={loadMyPayroll}
          >
            Kiểm tra lại
          </button>
        </div>
      )}

      {/* PAYROLL DATA */}
      {!loading && !error && payroll && (
        <>
          {/* THÔNG TIN NHÂN VIÊN */}
          <section className="my-payroll-profile">
            <div className="my-payroll-profile-avatar">
              <UserRound size={24} />
            </div>

            <div className="my-payroll-profile-info">
              <strong>{payroll.employeeName || "Nhân viên"}</strong>
              <span>
                {payroll.employeeCode || "Chưa có mã nhân viên"}
                {payroll.department
                  ? ` • ${payroll.department}`
                  : ""}
              </span>
            </div>
          </section>

          {/* TỔNG LƯƠNG */}
          <section className="my-payroll-total-card">
            <div className="my-payroll-total-content">
              <span>TỔNG LƯƠNG THỰC NHẬN</span>

              <h2>{money(totalSalary)}</h2>

              <small>
                Bảng lương tháng {month}/{year}
              </small>
            </div>

            <div
              className={`my-payroll-status ${
                isPaid ? "paid" : "draft"
              }`}
            >
              {isPaid ? (
                <CircleCheck size={17} />
              ) : (
                <Clock3 size={17} />
              )}

              {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
            </div>
          </section>

          {/* CHI TIẾT LƯƠNG */}
          <section className="my-payroll-panel">
            <div className="my-payroll-panel-heading">
              <div>
                <h3>Chi tiết bảng lương</h3>
                <p>Các khoản thu nhập và khấu trừ trong tháng</p>
              </div>

              <ReceiptText size={21} />
            </div>

            <div className="my-payroll-detail-list">
              {detailItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="my-payroll-detail-row"
                    key={item.label}
                  >
                    <div className="my-payroll-detail-label">
                      <span className={`detail-icon ${item.type}`}>
                        <Icon size={17} />
                      </span>

                      <span>{item.label}</span>
                    </div>

                    <strong className={item.type}>
                      {item.type === "plus" && "+ "}
                      {item.type === "minus" && "- "}
                      {money(item.value)}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="my-payroll-final-row">
              <span>Tổng thực nhận</span>
              <strong>{money(totalSalary)}</strong>
            </div>
          </section>

          {/* CHẤM CÔNG */}
          <section className="my-payroll-panel">
            <div className="my-payroll-panel-heading">
              <div>
                <h3>Thống kê chấm công</h3>
                <p>
                  Ngày công dùng để thống kê, không chia giảm lương
                  cơ bản tháng.
                </p>
              </div>

              <CalendarDays size={21} />
            </div>

            <div className="my-payroll-attendance-grid">
              <div>
                <span>Ngày công</span>
                <strong>{Number(payroll.workDays || 0)}</strong>
              </div>
            </div>
          </section>

          {/* GHI CHÚ */}
          {payroll.note && (
            <section className="my-payroll-note">
              <strong>Ghi chú từ quản lý</strong>
              <p>{payroll.note}</p>
            </section>
          )}

          {/* NGÀY THANH TOÁN */}
          {payroll.paidAt && (
            <div className="my-payroll-paid-date">
              <CircleCheck size={16} />
              Ngày thanh toán:{" "}
              {new Date(payroll.paidAt).toLocaleString("vi-VN")}
              {payroll.paidBy?.name
                ? ` • Người xác nhận: ${payroll.paidBy.name}`
                : ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}


import { useCallback, useEffect, useState } from "react";

import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

import "./Payroll.css";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "")}/api`;

const money = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const formatDate = (value) => {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";

  return date.toLocaleString("vi-VN");
};

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const fetchPayrolls = useCallback(async (signal) => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(`${API_URL}/payroll/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Không thể tải lịch sử thanh toán lương."
        );
      }

      if (signal?.aborted) return;

      const records = Array.isArray(data.history)
        ? data.history
        : Array.isArray(data.payrolls)
          ? data.payrolls
          : [];

      // Chỉ hiển thị các bản ghi đã thanh toán.
      const paidRecords = records
        .filter((item) => item.paidAt)
        .sort(
          (a, b) =>
            new Date(b.paidAt).getTime() -
            new Date(a.paidAt).getTime()
        );

      setPayrolls(paidRecords);
    } catch (err) {
      if (err.name === "AbortError") return;

      setError(
        err.message || "Có lỗi xảy ra khi tải lịch sử lương."
      );
      setPayrolls([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchPayrolls(controller.signal);

    return () => controller.abort();
  }, [fetchPayrolls]);

  const totalPaid = payrolls.reduce(
    (sum, item) => sum + Number(item.totalSalary || 0),
    0
  );

  const latestPayroll = payrolls[0] || null;

  const toggleDetail = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleRefresh = () => {
    fetchPayrolls();
  };

  return (
    <div className="employee-payroll-page">
      {/* HEADER */}
      <div className="employee-payroll-heading">
        <div>
          <h1>Lịch sử lương của tôi</h1>
          <p>
            Theo dõi các đợt lương đã được quản lý xác nhận thanh toán.
          </p>
        </div>

        <button
          type="button"
          className="employee-payroll-refresh"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "employee-payroll-spin" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* SUMMARY */}
      <div className="employee-payroll-summary">
        <div className="employee-payroll-summary-card">
          <div className="employee-payroll-summary-icon blue">
            <History size={22} />
          </div>

          <div>
            <span>Tổng số đợt đã thanh toán</span>
            <strong>{payrolls.length}</strong>
          </div>
        </div>

        <div className="employee-payroll-summary-card">
          <div className="employee-payroll-summary-icon green">
            <Wallet size={22} />
          </div>

          <div>
            <span>Tổng tiền đã nhận</span>
            <strong>{money(totalPaid)}</strong>
          </div>
        </div>

        <div className="employee-payroll-summary-card">
          <div className="employee-payroll-summary-icon orange">
            <CalendarClock size={22} />
          </div>

          <div>
            <span>Lần thanh toán gần nhất</span>
            <strong className="employee-payroll-latest-date">
              {latestPayroll ? formatDate(latestPayroll.paidAt) : "Chưa có"}
            </strong>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="employee-payroll-message">
          <RefreshCw size={18} className="employee-payroll-spin" />
          Đang tải lịch sử thanh toán...
        </div>
      ) : error ? (
        <div className="employee-payroll-message error">
          <AlertCircle size={18} />
          {error}
        </div>
      ) : payrolls.length === 0 ? (
        <div className="employee-payroll-empty">
          <div className="employee-payroll-empty-icon">
            <Wallet size={30} />
          </div>

          <h3>Chưa có lịch sử thanh toán</h3>

          <p>
            Khi quản lý tạo bảng lương và xác nhận đã thanh toán,
            thông tin sẽ xuất hiện tại đây.
          </p>

          <span>
            <Clock size={15} />
            Đang chờ đợt thanh toán đầu tiên
          </span>
        </div>
      ) : (
        <section className="employee-payroll-card">
          <div className="employee-payroll-card-heading">
            <div>
              <h2>Các đợt lương đã thanh toán</h2>
              <p>
                Có {payrolls.length} đợt thanh toán được lưu trong hệ thống.
              </p>
            </div>

            <span className="employee-payroll-history-count">
              {payrolls.length} đợt
            </span>
          </div>

          <div className="employee-payroll-history-list">
            {payrolls.map((payroll, index) => {
              const id = payroll._id || payroll.payrollId || index;
              const isExpanded = expandedId === id;

              return (
                <article
                  className="employee-payroll-history-item"
                  key={id}
                >
                  <div className="employee-payroll-history-main">
                    <div className="employee-payroll-history-icon">
                      <Wallet size={21} />
                    </div>

                    <div className="employee-payroll-history-info">
                      <div className="employee-payroll-history-title">
                        <h3>
                          Đợt lương #{payroll.batchNumber || index + 1}
                        </h3>

                        <span className="employee-payroll-status paid">
                          <CheckCircle2 size={15} />
                          Đã thanh toán
                        </span>
                      </div>

                      <p>
                        <CalendarClock size={15} />
                        Thanh toán: {formatDate(payroll.paidAt)}
                      </p>

                      <strong className="employee-payroll-history-total">
                        {money(payroll.totalSalary)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="employee-payroll-detail-toggle"
                      onClick={() => toggleDetail(id)}
                    >
                      {isExpanded ? (
                        <>
                          Thu gọn <ChevronUp size={17} />
                        </>
                      ) : (
                        <>
                          Chi tiết <ChevronDown size={17} />
                        </>
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="employee-payroll-history-detail">
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
                          <strong>{money(payroll.totalSalary)}</strong>
                        </div>
                      </div>

                      {payroll.rewardDetails?.length > 0 && (
                        <div className="employee-payroll-reward-details">
                          <h4>Chi tiết thưởng và phạt</h4>

                          <div className="employee-payroll-reward-table">
                            <div className="employee-payroll-reward-row header">
                              <span>Loại</span>
                              <span>Lý do</span>
                              <span>Số tiền</span>
                            </div>

                            {payroll.rewardDetails.map((reward, rewardIndex) => (
                              <div
                                className="employee-payroll-reward-row"
                                key={reward.rewardId || rewardIndex}
                              >
                                <span>{reward.type || "—"}</span>
                                <span>{reward.reason || "—"}</span>
                                <strong>{money(reward.amount)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="employee-payroll-history-meta">
                        <div>
                          <span>Người xác nhận</span>
                          <strong>
                            {payroll.paidBy?.name ||
                              payroll.paidBy?.fullName ||
                              "Quản lý"}
                          </strong>
                        </div>

                        {payroll.note && (
                          <div>
                            <span>Ghi chú</span>
                            <strong>{payroll.note}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <div className="employee-payroll-footnote">
        <AlertCircle size={17} />
        <span>
          Lịch sử chỉ hiển thị các khoản lương đã được quản lý xác nhận
          thanh toán. Các bảng lương nháp chưa thanh toán không xuất hiện
          tại đây.
        </span>
      </div>
    </div>
  );
}

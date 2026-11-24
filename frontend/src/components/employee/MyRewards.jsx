
import { useCallback, useEffect, useState } from "react";
import {
  Gift,
  RefreshCw,
  CalendarDays,
  Wallet,
  AlertCircle,
} from "lucide-react";

import "./MyRewards.css";

// Lấy URL API theo môi trường hiện tại
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Lấy token đăng nhập
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

// Định dạng tiền
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

// Định dạng ngày
const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN");
};

// Lấy số tiền
const getAmount = (item) =>
  Number(item.amount ?? item.value ?? item.points ?? 0);

// Xác định loại thưởng/phạt
const getType = (item) => {
  const value = String(
    item.type ||
    item.rewardType ||
    item.category ||
    ""
  ).toLowerCase();

  if (
    value.includes("penalty") ||
    value.includes("fine") ||
    value.includes("phạt")
  ) {
    return "penalty";
  }

  return "reward";
};

// Chuẩn hóa danh sách dữ liệu
const getRewardList = (result) => {
  if (Array.isArray(result)) return result;

  if (Array.isArray(result.rewards)) {
    return result.rewards;
  }

  if (Array.isArray(result.records)) {
    return result.records;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (Array.isArray(result.data?.rewards)) {
    return result.data.rewards;
  }

  if (Array.isArray(result.data?.records)) {
    return result.data.records;
  }

  return [];
};

export default function MyRewards() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // TẢI LỊCH SỬ THƯỞNG / PHẠT
  // ========================================

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
        );
      }

      const response = await fetch(
        `${API_URL}/api/rewards/me`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Kiểm tra kiểu dữ liệu server trả về
      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const responseText = await response.text();

        console.error(
          "API thưởng/phạt không trả về JSON:",
          {
            url: `${API_URL}/api/rewards/me`,
            status: response.status,
            contentType,
            response: responseText.slice(0, 300),
          }
        );

        throw new Error(
          `API trả về HTML hoặc dữ liệu không phải JSON (HTTP ${response.status}). Hãy kiểm tra địa chỉ API.`
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
          "Không thể tải lịch sử thưởng/phạt."
        );
      }

      const list = getRewardList(result);

      setRecords(list);
    } catch (err) {
      console.error("Fetch rewards error:", err);

      setError(
        err.message ||
        "Đã xảy ra lỗi khi tải lịch sử thưởng/phạt."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // ========================================
  // TÍNH TỔNG THƯỞNG / PHẠT
  // ========================================

  const totalReward = records.reduce(
    (sum, item) =>
      getType(item) === "reward"
        ? sum + Math.abs(getAmount(item))
        : sum,
    0
  );

  const totalPenalty = records.reduce(
    (sum, item) =>
      getType(item) === "penalty"
        ? sum + Math.abs(getAmount(item))
        : sum,
    0
  );

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <div className="my-rewards">
      <div className="my-rewards-heading">
        <div>
          <h2>Thưởng & phạt của tôi</h2>
          <p>
            Theo dõi lịch sử khen thưởng và các khoản phạt cá nhân.
          </p>
        </div>

        <button
          className="my-rewards-refresh"
          onClick={fetchRewards}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </div>

      <div className="my-rewards-stats">
        <div className="my-rewards-stat reward-stat">
          <div className="my-rewards-stat-icon">
            <Gift size={21} />
          </div>

          <div>
            <span>Tổng tiền thưởng</span>
            <strong>{formatMoney(totalReward)}</strong>
          </div>
        </div>

        <div className="my-rewards-stat penalty-stat">
          <div className="my-rewards-stat-icon">
            <AlertCircle size={21} />
          </div>

          <div>
            <span>Tổng tiền phạt</span>
            <strong>{formatMoney(totalPenalty)}</strong>
          </div>
        </div>

        <div className="my-rewards-stat">
          <div className="my-rewards-stat-icon">
            <Wallet size={21} />
          </div>

          <div>
            <span>Số bản ghi</span>
            <strong>{records.length}</strong>
          </div>
        </div>
      </div>

      <div className="my-rewards-table-card">
        <div className="my-rewards-table-heading">
          <div>
            <h3>Lịch sử thưởng & phạt</h3>
            <p>
              Các khoản được ghi nhận cho tài khoản của bạn
            </p>
          </div>
        </div>

        {loading ? (
          <div className="my-rewards-state">
            <RefreshCw
              className="my-rewards-spinner"
              size={24}
            />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="my-rewards-state my-rewards-error">
            <AlertCircle size={22} />
            <span>{error}</span>

            <button
              type="button"
              onClick={fetchRewards}
            >
              Thử lại
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="my-rewards-state">
            <Gift size={30} />
            <strong>Chưa có dữ liệu thưởng/phạt</strong>
            <span>
              Các khoản được ghi nhận sẽ xuất hiện tại đây.
            </span>
          </div>
        ) : (
          <div className="my-rewards-table-wrap">
            <table className="my-rewards-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Loại</th>
                  <th>Lý do</th>
                  <th>Số tiền</th>
                  <th>Ngày ghi nhận</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {records.map((item, index) => {
                  const type = getType(item);
                  const amount = Math.abs(getAmount(item));
                  const settled = Boolean(item.payrollBatchId);

                  return (
                    <tr key={item._id || item.id || index}>
                      <td>{index + 1}</td>

                      <td>
                        <span
                          className={`my-rewards-type ${type}`}
                        >
                          {type === "reward" ? "Thưởng" : "Phạt"}
                        </span>
                      </td>

                      <td className="my-rewards-reason">
                        {item.reason ||
                          item.description ||
                          item.note ||
                          "—"}
                      </td>

                      <td>
                        <strong
                          className={
                            type === "reward"
                              ? "money-positive"
                              : "money-negative"
                          }
                        >
                          {type === "reward" ? "+" : "-"}
                          {formatMoney(amount)}
                        </strong>
                      </td>

                      <td>
                        <span className="my-rewards-date">
                          <CalendarDays size={14} />
                          {formatDate(item.date || item.createdAt)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`my-rewards-status ${
                            settled ? "settled" : "pending"
                          }`}
                        >
                          {settled
                            ? "Đã tính lương"
                            : "Chưa tính lương"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

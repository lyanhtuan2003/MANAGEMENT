import { useState } from "react";

import {
  UserRound,
  Mail,
  Phone,
  BriefcaseBusiness,
  CalendarDays,
  Wallet,
  Building2,
  BadgeCheck,
  Users,
  Landmark,
  Save,
  Pencil,
  X,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

// ========================================
// LẤY THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP
// ========================================

const getCurrentUser = () => {
  const possibleKeys = ["user", "currentUser", "authUser"];

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key);

      if (!value) continue;

      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object") {
        return parsed.user || parsed.data?.user || parsed;
      }
    } catch (error) {
      console.error(`Không đọc được dữ liệu ${key}:`, error);
    }
  }

  return {};
};

// ========================================
// ĐỊNH DẠNG DỮ LIỆU
// ========================================

const formatDate = (date) => {
  if (!date) return "Chưa cập nhật";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Chưa cập nhật";
  }

  return parsedDate.toLocaleDateString("vi-VN");
};

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Chưa cập nhật";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Chưa cập nhật";
  }

  return `${number.toLocaleString("vi-VN")} VNĐ`;
};

// ========================================
// TRẠNG THÁI TÀI KHOẢN
// ========================================

const getStatus = (user) => {
  if (user.isActive === false) return "Đã khóa";

  switch (user.status) {
    case "probation":
      return "Thử việc";

    case "resigned":
      return "Đã nghỉ việc";

    case "working":
      return "Đang làm việc";

    default:
      return "Chưa cập nhật";
  }
};

// ========================================
// LOẠI TÀI KHOẢN
// ========================================

const getRole = (user) => {
  switch (user.role) {
    case "accountant":
      return "Kế toán";

    case "manager":
      return "Quản lý";

    case "employee":
      return "Nhân viên";

    default:
      return "Chưa xác định";
  }
};

// ========================================
// TẠO CHỮ VIẾT TẮT AVATAR
// ========================================

const getInitials = (name = "") => {
  return (
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "NV"
  );
};

// ========================================
// COMPONENT HỒ SƠ CÁ NHÂN
// ========================================

export default function MyProfile() {
  const employeeData = getCurrentUser();
    const [bankInfo, setBankInfo] = useState({
    bankName: employeeData.bankInfo?.bankName || "",
    accountNumber: employeeData.bankInfo?.accountNumber || "",
    accountHolder: employeeData.bankInfo?.accountHolder || "",
    branch: employeeData.bankInfo?.branch || "",
  });

  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState("");
  const [bankError, setBankError] = useState("");


  const handleSaveBankInfo = async (event) => {
    event.preventDefault();

    if (savingBank) return;

    if (
      !bankInfo.bankName.trim() ||
      !bankInfo.accountNumber.trim() ||
      !bankInfo.accountHolder.trim()
    ) {
      setBankError("Vui lòng nhập ngân hàng, số tài khoản và chủ tài khoản.");
      setBankMessage("");
      return;
    }

    const token = getToken();

    if (!token) {
      setBankError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setSavingBank(true);
      setBankError("");
      setBankMessage("");

      const response = await fetch(`${API_URL}/profile/bank-info`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankInfo),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Không thể lưu thông tin ngân hàng.");
      }

      const savedBankInfo = result.bankInfo || bankInfo;

      setBankInfo({
        bankName: savedBankInfo.bankName || "",
        accountNumber: savedBankInfo.accountNumber || "",
        accountHolder: savedBankInfo.accountHolder || "",
        branch: savedBankInfo.branch || "",
      });

      // Cập nhật thông tin ngân hàng trong dữ liệu đăng nhập đang lưu.
      ["user", "currentUser", "authUser"].forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;

          const parsed = JSON.parse(raw);

          if (parsed && typeof parsed === "object") {
            if (parsed.user && typeof parsed.user === "object") {
              parsed.user.bankInfo = savedBankInfo;
            } else if (parsed.data?.user) {
              parsed.data.user.bankInfo = savedBankInfo;
            } else {
              parsed.bankInfo = savedBankInfo;
            }

            localStorage.setItem(key, JSON.stringify(parsed));
          }
        } catch (error) {
          console.error("Không thể cập nhật dữ liệu hồ sơ:", error);
        }
      });

      setEditingBank(false);
      setBankMessage("Cập nhật tài khoản ngân hàng thành công!");
    } catch (error) {
      setBankError(error.message || "Có lỗi xảy ra khi lưu thông tin.");
    } finally {
      setSavingBank(false);
    }
  };

  const name = employeeData.name || "Chưa cập nhật";

  const position =
    employeeData.position || getRole(employeeData);

  const status = getStatus(employeeData);

  // ========================================
  // DANH SÁCH THÔNG TIN
  // ========================================

  const profileItems = [
    {
      label: "Mã nhân viên",
      value:
        employeeData.employeeCode ||
        employeeData.id ||
        employeeData._id ||
        "Chưa cập nhật",
      icon: UserRound,
    },
    {
      label: "Họ và tên",
      value: name,
      icon: UserRound,
    },
    {
      label: "Email",
      value: employeeData.email || "Chưa cập nhật",
      icon: Mail,
    },
    {
      label: "Số điện thoại",
      value: employeeData.phone || "Chưa cập nhật",
      icon: Phone,
    },
    {
      label: "Phòng ban",
      value: employeeData.department || "Chưa cập nhật",
      icon: Building2,
    },
    {
      label: "Chức vụ",
      value: position,
      icon: BriefcaseBusiness,
    },
    {
      label: "Loại tài khoản",
      value: getRole(employeeData),
      icon: Users,
    },
    {
      label: "Lương cơ bản",
      value: formatMoney(employeeData.salary),
      icon: Wallet,
    },
    {
      label: "Trạng thái",
      value: status,
      icon: BadgeCheck,
    },
    {
      label: "Ngày vào làm",
      value: formatDate(
        employeeData.joinDate || employeeData.createdAt
      ),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="employee-page">
      <style>{`

        /* =====================================
           TỔNG THỂ TRANG HỒ SƠ
        ===================================== */

        .employee-page {
          width: 100%;
          max-width: none;
          min-height: 100%;
          margin: 0;
          padding: 30px 36px 50px;
          box-sizing: border-box;
          background: #f5f7fc;
          color: #1e293b;
          font-family: "Be Vietnam Pro", sans-serif;
        }

        /* =====================================
           TIÊU ĐỀ
        ===================================== */

        .employee-section-title {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 26px;
        }

        .employee-section-title h1 {
          margin: 0;
          color: #1e293b;
          font-size: 28px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .employee-section-title p {
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 400;
        }

        /* =====================================
           KHUNG HỒ SƠ
        ===================================== */

        .profile-panel {
          width: 100%;
          max-width: none;
          overflow: hidden;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.035);
        }

        /* =====================================
           BANNER
        ===================================== */

        .profile-cover {
          position: relative;
          width: 100%;
          height: 165px;
          background: linear-gradient(
            110deg,
            #3888ed 0%,
            #4c9bea 50%,
            #72b3f5 100%
          );
        }

        /* =====================================
           THÔNG TIN CHÍNH
        ===================================== */

        .profile-main {
          width: 100%;
          min-height: 190px;
          padding: 0 24px 30px;
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: flex-start;
          border-bottom: 1px solid #edf0f5;
          text-align: center;
          box-sizing: border-box;
        }

        /* =====================================
           AVATAR
        ===================================== */

        .profile-large-avatar {
          width: 100px;
          height: 100px;
          min-width: 100px;
          margin-top: -51px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 6px solid #ffffff;
          border-radius: 50%;
          background: #e8f1ff;
          color: #3988ed;
          font-size: 27px;
          font-weight: 750;
          box-sizing: border-box;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.05);
        }

        /* =====================================
           TÊN VÀ CHỨC VỤ
        ===================================== */

        .profile-main h2 {
          margin: 0 0 7px;
          color: #172554;
          font-size: 21px;
          font-weight: 750;
        }

        .profile-main p {
          margin: 0 0 14px;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 400;
        }

        /* =====================================
           TRẠNG THÁI
        ===================================== */

        .profile-active {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 5px 17px;
          border-radius: 30px;
          background: #e7f8f1;
          color: #10a779;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.4;
        }

        .profile-active.probation {
          background: #fff7e6;
          color: #d97706;
        }

        .profile-active.inactive {
          background: #fef2f2;
          color: #dc2626;
        }

        /* =====================================
           KHU VỰC THÔNG TIN
        ===================================== */

        .profile-information {
          width: 100%;
          padding: 34px 36px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 100px;
          row-gap: 28px;
          box-sizing: border-box;
        }

        /* =====================================
           TỪNG DÒNG THÔNG TIN
        ===================================== */

        .profile-information-item {
          min-width: 0;
          min-height: 52px;
          display: flex;
          align-items: center;
          gap: 17px;
          transition: transform 0.2s ease;
        }

        .profile-information-item:hover {
          transform: translateX(4px);
        }

        /* =====================================
           ICON
        ===================================== */

        .profile-information-icon {
          width: 48px;
          height: 48px;
          min-width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #eaf2ff;
          color: #3988ed;
          transition: all 0.2s ease;
        }

        .profile-information-icon svg {
          width: 23px;
          height: 23px;
          stroke-width: 1.9;
        }

        .profile-information-item:hover
        .profile-information-icon {
          background: #dbeafe;
          transform: scale(1.04);
        }

        /* =====================================
           NỘI DUNG THÔNG TIN
        ===================================== */

        .profile-information-item > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .profile-information-item span {
          color: #94a3b8;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.5;
        }

        .profile-information-item strong {
          display: block;
          overflow: hidden;
          color: #172554;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.6;
          text-overflow: ellipsis;
          overflow-wrap: anywhere;
        }

        /* =====================================
           RESPONSIVE TABLET
        ===================================== */

        @media (max-width: 1100px) {

          .employee-page {
            padding: 25px 22px 40px;
          }

          .profile-information {
            column-gap: 45px;
            padding: 28px;
          }

        }

        /* =====================================
           RESPONSIVE MOBILE
        ===================================== */

        @media (max-width: 600px) {

          .employee-page {
            padding: 18px 12px 30px;
          }

          .employee-section-title {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
          }

          .employee-section-title h1 {
            font-size: 23px;
          }

          .employee-section-title p {
            font-size: 12px;
          }

          .profile-cover {
            height: 115px;
          }

          .profile-main {
            min-height: 165px;
            padding-bottom: 23px;
          }

          .profile-large-avatar {
            width: 84px;
            height: 84px;
            min-width: 84px;
            margin-top: -43px;
            font-size: 23px;
          }

          .profile-main h2 {
            font-size: 18px;
          }

          .profile-main p {
            font-size: 12px;
          }

          .profile-information {
            grid-template-columns: 1fr;
            padding: 24px 18px;
            row-gap: 22px;
          }

          .profile-information-item {
            gap: 14px;
          }

          .profile-information-icon {
            width: 44px;
            height: 44px;
            min-width: 44px;
          }

          .profile-information-icon svg {
            width: 21px;
            height: 21px;
          }

          .profile-information-item span {
            font-size: 12px;
          }

          .profile-information-item strong {
            font-size: 13px;
          }

        }

        /* =====================================
           MOBILE NHỎ
        ===================================== */

        @media (max-width: 360px) {

          .employee-page {
            padding: 14px 8px 25px;
          }

          .profile-information {
            padding: 20px 12px;
          }

          .profile-information-item {
            gap: 11px;
          }

        }

.profile-bank-panel {
  margin-top: 22px;
  padding: 26px 30px;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 16px;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.035);
}

.profile-bank-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 22px;
}

.profile-bank-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3988ed;
}

.profile-bank-title h2 {
  margin: 0;
  color: #172554;
  font-size: 17px;
  font-weight: 700;
}

.profile-bank-heading p {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.profile-bank-edit,
.profile-bank-save,
.profile-bank-cancel {
  min-height: 39px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: .2s;
}

.profile-bank-edit {
  border: 1px solid #d8e7ff;
  background: #edf5ff;
  color: #2878e8;
}

.profile-bank-save {
  border: 1px solid #3988ed;
  background: #3988ed;
  color: white;
}

.profile-bank-cancel {
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
}

.profile-bank-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-bank-grid label,
.profile-bank-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  color: #64748b;
  font-size: 12px;
}

.profile-bank-grid input {
  width: 100%;
  min-height: 43px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  font: inherit;
  color: #172554;
}

.profile-bank-grid input:focus {
  border-color: #3988ed;
  box-shadow: 0 0 0 3px rgba(57, 136, 237, .1);
}

.profile-bank-item {
  padding: 15px;
  background: #f6f8fc;
  border: 1px solid #e8edf5;
  border-radius: 9px;
}

.profile-bank-item span {
  color: #94a3b8;
  font-size: 12px;
}

.profile-bank-item strong {
  color: #172554;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.profile-bank-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.profile-bank-success,
.profile-bank-error {
  margin-bottom: 15px;
  padding: 11px 13px;
  border-radius: 8px;
  font-size: 12px;
}

.profile-bank-success {
  color: #15803d;
  background: #f0fdf4;
}

.profile-bank-error {
  color: #dc2626;
  background: #fef2f2;
}

.profile-bank-save:disabled,
.profile-bank-cancel:disabled {
  opacity: .55;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .profile-bank-panel {
    padding: 20px 16px;
  }

  .profile-bank-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-bank-grid {
    grid-template-columns: 1fr;
  }

  .profile-bank-actions {
    flex-wrap: wrap;
  }
}


      `}</style>

      {/* =====================================
          TIÊU ĐỀ TRANG
      ===================================== */}

      <div className="employee-section-title">
        <h1>Hồ sơ cá nhân</h1>

        <p>
          Thông tin tài khoản và hồ sơ nhân viên.
        </p>
      </div>

      {/* =====================================
          KHUNG HỒ SƠ
      ===================================== */}

      <section className="profile-panel">

        {/* BANNER */}

        <div className="profile-cover" />

        {/* THÔNG TIN CHÍNH */}

        <div className="profile-main">

          <div className="profile-large-avatar">
            {getInitials(name)}
          </div>

          <h2>{name}</h2>

          <p>{position}</p>

          <span
            className={`profile-active ${
              employeeData.status === "probation"
                ? "probation"
                : employeeData.status === "resigned" ||
                  employeeData.isActive === false
                ? "inactive"
                : ""
            }`}
          >
            {status}
          </span>

        </div>

        {/* =====================================
            CHI TIẾT HỒ SƠ
        ===================================== */}

        <div className="profile-information">

          {profileItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="profile-information-item"
                key={item.label}
              >

                <div className="profile-information-icon">
                  <Icon />
                </div>

                <div>
                  <span>{item.label}</span>

                  <strong>{item.value}</strong>
                </div>

              </div>
            );
          })}

        </div>

      </section>

      {/* =====================================
          THÔNG TIN TÀI KHOẢN NGÂN HÀNG
      ===================================== */}

      <section className="profile-bank-panel">
        <div className="profile-bank-heading">
          <div>
            <div className="profile-bank-title">
              <Landmark size={21} />
              <h2>Thông tin tài khoản ngân hàng</h2>
            </div>

            <p>
              Thông tin dùng để công ty chuyển khoản lương cho bạn.
            </p>
          </div>

          {!editingBank && (
            <button
              type="button"
              className="profile-bank-edit"
              onClick={() => {
                setBankError("");
                setBankMessage("");
                setEditingBank(true);
              }}
            >
              <Pencil size={15} />
              Chỉnh sửa
            </button>
          )}
        </div>

        {bankMessage && (
          <div className="profile-bank-success">
            {bankMessage}
          </div>
        )}

        {bankError && (
          <div className="profile-bank-error">
            {bankError}
          </div>
        )}

        {editingBank ? (
          <form onSubmit={handleSaveBankInfo}>
            <div className="profile-bank-grid">
              <label>
                Tên ngân hàng *
                <input
                  type="text"
                  placeholder="Ví dụ: Vietcombank"
                  value={bankInfo.bankName}
                  onChange={(e) =>
                    setBankInfo((prev) => ({
                      ...prev,
                      bankName: e.target.value,
                    }))
                  }
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Số tài khoản *
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập số tài khoản"
                  value={bankInfo.accountNumber}
                  onChange={(e) =>
                    setBankInfo((prev) => ({
                      ...prev,
                      accountNumber: e.target.value.replace(/\s/g, ""),
                    }))
                  }
                  maxLength={50}
                  required
                />
              </label>

              <label>
                Chủ tài khoản *
                <input
                  type="text"
                  placeholder="NGUYEN VAN A"
                  value={bankInfo.accountHolder}
                  onChange={(e) =>
                    setBankInfo((prev) => ({
                      ...prev,
                      accountHolder: e.target.value,
                    }))
                  }
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Chi nhánh
                <input
                  type="text"
                  placeholder="Tên chi nhánh (không bắt buộc)"
                  value={bankInfo.branch}
                  onChange={(e) =>
                    setBankInfo((prev) => ({
                      ...prev,
                      branch: e.target.value,
                    }))
                  }
                  maxLength={150}
                />
              </label>
            </div>

            <div className="profile-bank-actions">
              <button
                type="button"
                className="profile-bank-cancel"
                disabled={savingBank}
                onClick={() => {
                  setBankInfo({
                    bankName: employeeData.bankInfo?.bankName || "",
                    accountNumber: employeeData.bankInfo?.accountNumber || "",
                    accountHolder: employeeData.bankInfo?.accountHolder || "",
                    branch: employeeData.bankInfo?.branch || "",
                  });

                  setEditingBank(false);
                  setBankError("");
                  setBankMessage("");
                }}
              >
                <X size={16} />
                Hủy
              </button>

              <button
                type="submit"
                className="profile-bank-save"
                disabled={savingBank}
              >
                <Save size={16} />
                {savingBank ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-bank-grid">
            <div className="profile-bank-item">
              <span>Ngân hàng</span>
              <strong>{bankInfo.bankName || "Chưa cập nhật"}</strong>
            </div>

            <div className="profile-bank-item">
              <span>Số tài khoản</span>
              <strong>{bankInfo.accountNumber || "Chưa cập nhật"}</strong>
            </div>

            <div className="profile-bank-item">
              <span>Chủ tài khoản</span>
              <strong>{bankInfo.accountHolder || "Chưa cập nhật"}</strong>
            </div>

            <div className="profile-bank-item">
              <span>Chi nhánh</span>
              <strong>{bankInfo.branch || "Chưa cập nhật"}</strong>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
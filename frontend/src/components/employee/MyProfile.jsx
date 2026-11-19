
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
} from "lucide-react";

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
    </div>
  );
}

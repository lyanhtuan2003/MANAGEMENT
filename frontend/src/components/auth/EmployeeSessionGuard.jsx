
import { useEffect } from "react";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Loại bỏ dấu / ở cuối và /api nếu đã được khai báo
const API_BASE_URL = RAW_API_URL
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_URL = `${API_BASE_URL}/api`;

// ========================================
// CÁC VAI TRÒ HỢP LỆ
// ========================================

const VALID_ROLES = [
  "manager",
  "accountant",
  "employee",
];

// ========================================
// LẤY TOKEN
// ========================================

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken")
  );
};

// ========================================
// XÓA PHIÊN ĐĂNG NHẬP
// ========================================

const clearAuthStorage = () => {
  const keys = [
    "token",
    "authToken",
    "accessToken",
    "user",
    "userRole",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
};

// ========================================
// LẤY USER ĐÃ LƯU
// ========================================

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Không thể đọc thông tin người dùng:", error);
    return {};
  }
};

// ========================================
// EMPLOYEE SESSION GUARD
// Kiểm tra phiên cho cả 3 vai trò
// ========================================

export default function EmployeeSessionGuard({
  role,
  onLogout,
}) {
  useEffect(() => {
    // ========================================
    // KIỂM TRA VAI TRÒ
    // ========================================

    if (!VALID_ROLES.includes(role)) {
      return undefined;
    }

    let isMounted = true;
    let isChecking = false;
    let logoutCalled = false;

    // ========================================
    // ĐĂNG XUẤT KHI PHIÊN KHÔNG HỢP LỆ
    // ========================================

    const forceLogout = (message) => {
      if (!isMounted || logoutCalled) return;

      logoutCalled = true;

      clearAuthStorage();

      sessionStorage.setItem("authMessage", message);

      if (typeof onLogout === "function") {
        onLogout();
      }
    };

    // ========================================
    // KIỂM TRA TOKEN
    // ========================================

    const token = getToken();

    if (!token) {
      forceLogout(
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );

      return () => {
        isMounted = false;
      };
    }

    // ========================================
    // KIỂM TRA TÀI KHOẢN VỚI BACKEND
    // ========================================

    const checkAccount = async () => {
      if (!isMounted || isChecking || logoutCalled) {
        return;
      }

      isChecking = true;

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!isMounted) return;

        // ========================================
        // TOKEN HẾT HẠN HOẶC TÀI KHOẢN KHÔNG HỢP LỆ
        // ========================================

        if (response.status === 401) {
          forceLogout(
            "Tài khoản không tồn tại, đã bị khóa hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          );

          return;
        }

        // ========================================
        // KHÔNG CÓ QUYỀN TRUY CẬP
        // ========================================

        if (response.status === 403) {
          forceLogout(
            "Tài khoản không có quyền truy cập khu vực này."
          );

          return;
        }

        // ========================================
        // LỖI HTTP KHÁC
        // ========================================

        if (!response.ok) {
          console.error(
            "Không thể kiểm tra trạng thái tài khoản:",
            response.status
          );

          return;
        }

        // ========================================
        // ĐỌC DỮ LIỆU
        // ========================================

        const data = await response.json();

        if (!isMounted) return;

        const serverUser =
          data?.user ||
          data?.data?.user ||
          null;

        if (!serverUser) {
          console.error(
            "API /auth/me không trả về thông tin người dùng."
          );

          return;
        }

        // ========================================
        // KIỂM TRA VAI TRÒ
        // ========================================

        if (
          serverUser.role &&
          serverUser.role !== role
        ) {
          forceLogout(
            "Vai trò tài khoản đã thay đổi. Vui lòng đăng nhập lại."
          );

          return;
        }

        // ========================================
        // KIỂM TRA TRẠNG THÁI TÀI KHOẢN
        // ========================================

        const accountIsLocked =
          serverUser.isActive === false ||
          serverUser.status === "resigned" ||
          serverUser.status === "locked" ||
          serverUser.status === "inactive";

        if (accountIsLocked) {
          forceLogout(
            "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản lý."
          );

          return;
        }

        // ========================================
        // ĐỒNG BỘ THÔNG TIN NGƯỜI DÙNG
        // ========================================

        const currentUser = getStoredUser();

        const updatedUser = {
          ...currentUser,
          ...serverUser,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );

        // Đồng bộ lại vai trò
        if (serverUser.role) {
          localStorage.setItem(
            "userRole",
            serverUser.role
          );
        }
      } catch (error) {
        // Lỗi mạng tạm thời không tự động đăng xuất
        if (isMounted) {
          console.error(
            "Lỗi kiểm tra phiên đăng nhập:",
            error
          );
        }
      } finally {
        isChecking = false;
      }
    };

    // ========================================
    // KIỂM TRA NGAY KHI ĐĂNG NHẬP
    // ========================================

    checkAccount();

    // ========================================
    // KIỂM TRA ĐỊNH KỲ MỖI 5 GIÂY
    // ========================================

    const interval = window.setInterval(() => {
      checkAccount();
    }, 5000);

    // ========================================
    // KIỂM TRA KHI QUAY LẠI TAB
    // ========================================

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAccount();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      isMounted = false;

      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [role, onLogout]);

  return null;
}

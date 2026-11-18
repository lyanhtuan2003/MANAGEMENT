
import { useEffect, useRef } from "react";

const API_URL = "http://localhost:5000/api";

export default function EmployeeSessionGuard({
  role,
  onLogout,
}) {
  const checking = useRef(false);

  useEffect(() => {
    if (role !== "employee") return;

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    if (!token) {
      sessionStorage.setItem(
        "authMessage",
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );

      onLogout();
      return;
    }

    let isMounted = true;

    const checkAccount = async () => {
      if (checking.current || !isMounted) return;

      checking.current = true;

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        // Tài khoản đã bị khóa hoặc phiên đăng nhập hết hạn
        if (response.status === 401) {
          if (!isMounted) return;

          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          localStorage.removeItem("userRole");

          sessionStorage.setItem(
            "authMessage",
            "Tài khoản của bạn đã bị khóa hoặc phiên đăng nhập đã hết hạn. Vui lòng liên hệ quản lý."
          );

          onLogout();
          return;
        }

        // Các lỗi HTTP khác không tự động đăng xuất.
        if (!response.ok) {
          console.error(
            "Không thể kiểm tra trạng thái tài khoản:",
            response.status
          );
        }
      } catch (error) {
        // Lỗi mạng tạm thời không xóa phiên đăng nhập.
        console.error("Lỗi kiểm tra phiên:", error);
      } finally {
        checking.current = false;
      }
    };

    // Kiểm tra ngay khi nhân viên vào hệ thống
    checkAccount();

    // Kiểm tra định kỳ mỗi 5 giây
    const interval = setInterval(checkAccount, 5000);

    // Kiểm tra lại ngay khi nhân viên quay lại tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAccount();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      isMounted = false;
      clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [role, onLogout]);

  return null;
}

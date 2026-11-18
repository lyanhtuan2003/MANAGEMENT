
import { useState } from "react";

import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  Users,
  BriefcaseBusiness,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  LoaderCircle,
} from "lucide-react";

import "./Login.css";

// API Backend
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function Login({ onLogin }) {
  const [role, setRole] = useState("employee");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // XỬ LÝ ĐĂNG NHẬP
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      // Đọc dữ liệu từ Backend
      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");
      }

      // Kiểm tra đăng nhập
      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Email hoặc mật khẩu không chính xác."
        );
      }

      // Kiểm tra token
      if (!data.token) {
        throw new Error("Không nhận được mã xác thực từ máy chủ.");
      }

      // Kiểm tra user
      if (!data.user || !data.user.id || !data.user.role) {
        throw new Error("Thông tin tài khoản không hợp lệ.");
      }

      // Kiểm tra vai trò
      if (data.user.role !== role) {
        throw new Error(
          role === "manager"
            ? "Tài khoản này không có quyền quản lý."
            : "Đây không phải tài khoản nhân viên."
        );
      }

      // Kiểm tra trạng thái tài khoản
      if (
        data.user.isActive === false ||
        data.user.status === "resigned"
      ) {
        throw new Error("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động.");
      }

      // Xóa thông tin đăng nhập cũ
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");

      // LƯU JWT
      localStorage.setItem("token", data.token);

      // Tương thích component cũ
      localStorage.setItem("authToken", data.token);

      // Lưu thông tin người dùng
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Lưu vai trò
      localStorage.setItem(
        "userRole",
        data.user.role
      );

      // Chuyển vào Dashboard
      if (typeof onLogin === "function") {
        onLogin(data.user.role, data.user);
      } else {
        throw new Error("Không thể khởi tạo phiên đăng nhập.");
      }

    } catch (err) {
      console.error("Login error:", err);

      setError(
        err instanceof TypeError
          ? "Không thể kết nối máy chủ. Vui lòng kiểm tra Backend."
          : err.message || "Đăng nhập thất bại. Vui lòng thử lại."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">

      {/* BÊN TRÁI */}
      <section className="login-left">

        <div className="login-brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={25} />
          </div>

          <span>
            INTERNAL<span className="brand-highlight">.</span>
          </span>
        </div>

        <div className="login-intro">

          <span className="intro-label">
            <Sparkles size={15} />
            INTERNAL MANAGEMENT SYSTEM
          </span>

          <h1>
            Quản lý công việc.
            <br />
            <span>Kết nối đội ngũ.</span>
          </h1>

          <p>
            Nền tảng quản lý nội bộ giúp doanh nghiệp
            vận hành hiệu quả, minh bạch và chuyên nghiệp.
          </p>

          <div className="login-features">

            <div>
              <ShieldCheck size={20} />
              <span>Quản lý nhân sự tập trung</span>
            </div>

            <div>
              <Users size={20} />
              <span>Kết nối và phân quyền rõ ràng</span>
            </div>

            <div>
              <BriefcaseBusiness size={20} />
              <span>Theo dõi dự án hiệu quả</span>
            </div>

          </div>
        </div>

        <div className="login-left-footer">
          © 2026 Internal Management. All rights reserved.
        </div>

      </section>

      {/* BÊN PHẢI */}
      <section className="login-right">

        <div className="login-form-wrapper">

          {/* LOGO MOBILE */}
          <div className="mobile-brand">
            <div className="brand-icon">
              <BriefcaseBusiness size={22} />
            </div>

            <strong>
              INTERNAL<span>.</span>
            </strong>
          </div>

          {/* TIÊU ĐỀ */}
          <div className="form-heading">

            <span>WELCOME BACK</span>

            <h2>Chào mừng trở lại!</h2>

            <p>
              Đăng nhập để tiếp tục công việc của bạn.
            </p>

          </div>

          <form onSubmit={handleSubmit}>

            {/* CHỌN VAI TRÒ */}
            <label className="form-label">
              Chọn vai trò đăng nhập
            </label>

            <div className="role-options">

              {/* NHÂN VIÊN */}
              <button
                type="button"
                className={`role-option ${
                  role === "employee" ? "active" : ""
                }`}
                onClick={() => {
                  setRole("employee");
                  setError("");
                }}
                disabled={loading}
              >

                <div className="role-icon employee-icon">
                  <Users size={21} />
                </div>

                <div>
                  <strong>Nhân viên</strong>
                  <small>Employee</small>
                </div>

                <span className="role-radio">
                  {role === "employee" && <i />}
                </span>

              </button>

              {/* QUẢN LÝ */}
              <button
                type="button"
                className={`role-option ${
                  role === "manager" ? "active" : ""
                }`}
                onClick={() => {
                  setRole("manager");
                  setError("");
                }}
                disabled={loading}
              >

                <div className="role-icon manager-icon">
                  <BriefcaseBusiness size={21} />
                </div>

                <div>
                  <strong>Quản lý</strong>
                  <small>Manager</small>
                </div>

                <span className="role-radio">
                  {role === "manager" && <i />}
                </span>

              </button>

            </div>

            {/* EMAIL */}
            <label
              className="form-label"
              htmlFor="login-email"
            >
              Địa chỉ email
            </label>

            <div className="login-input">

              <Mail size={19} />

              <input
                id="login-email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                autoComplete="username"
                required
                disabled={loading}
              />

            </div>

            {/* MẬT KHẨU */}
            <label
              className="form-label"
              htmlFor="login-password"
            >
              Mật khẩu
            </label>

            <div className="login-input">

              <LockKeyhole size={19} />

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? "Ẩn mật khẩu"
                    : "Hiện mật khẩu"
                }
                disabled={loading}
              >

                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}

              </button>

            </div>

            {/* THÔNG BÁO LỖI */}
            {error && (
              <div
                className="login-error"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* NÚT ĐĂNG NHẬP */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="login-spinner"
                  />
                  Đang xác thực...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight size={19} />
                </>
              )}

            </button>

          </form>

          {/* BẢO MẬT */}
          <div className="login-security">
            <ShieldCheck size={17} />

            <span>
              Hệ thống quản lý nội bộ an toàn
            </span>
          </div>

        </div>

      </section>

    </main>
  );
}

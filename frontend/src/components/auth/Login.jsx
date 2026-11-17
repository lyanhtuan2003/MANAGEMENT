
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
} from "lucide-react";
import "./Login.css";

export default function Login({ onLogin }) {
  const [role, setRole] = useState("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    // Giai đoạn giao diện: chuyển vai trò.
    // Sau này thay bằng API xác thực từ Node.js.
    onLogin(role);
  };

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={25} />
          </div>
          <span>INTERNAL<span className="brand-highlight">.</span></span>
        </div>

        <div className="login-intro">
          <span className="intro-label">
            <Sparkles size={15} /> INTERNAL MANAGEMENT SYSTEM
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

      <section className="login-right">
        <div className="login-form-wrapper">
          <div className="mobile-brand">
            <div className="brand-icon">
              <BriefcaseBusiness size={22} />
            </div>
            <strong>INTERNAL<span>.</span></strong>
          </div>

          <div className="form-heading">
            <span>WELCOME BACK</span>
            <h2>Chào mừng trở lại!</h2>
            <p>Đăng nhập để tiếp tục công việc của bạn.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="form-label">Chọn vai trò đăng nhập</label>

            <div className="role-options">
              <button
                type="button"
                className={`role-option ${
                  role === "employee" ? "active" : ""
                }`}
                onClick={() => setRole("employee")}
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

              <button
                type="button"
                className={`role-option ${
                  role === "manager" ? "active" : ""
                }`}
                onClick={() => setRole("manager")}
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

            <label className="form-label" htmlFor="login-email">
              Địa chỉ email
            </label>

            <div className="login-input">
              <Mail size={19} />
              <input
                id="login-email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label className="form-label" htmlFor="login-password">
              Mật khẩu
            </label>

            <div className="login-input">
              <LockKeyhole size={19} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu của bạn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Hiện hoặc ẩn mật khẩu"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit">
              Đăng nhập
              <ArrowRight size={19} />
            </button>
          </form>

          <div className="login-security">
            <ShieldCheck size={17} />
            <span>Hệ thống quản lý nội bộ an toàn</span>
          </div>
        </div>
      </section>
    </main>
  );
}

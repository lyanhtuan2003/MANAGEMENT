
import { useState } from "react";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  LoaderCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./ChangePassword.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Đặt PasswordField bên ngoài ChangePassword để tránh mất focus khi nhập
function PasswordField({
  label,
  value,
  onChange,
  visible,
  setVisible,
  placeholder,
  autoComplete = "new-password",
}) {
  return (
    <div className="change-password-field">
      <label>{label}</label>

      <div className="change-password-input-wrap">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          maxLength={128}
        />

        <button
          type="button"
          className="change-password-eye"
          onClick={() => setVisible((previous) => !previous)}
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePassword({
  user,
  onSuccess,
  onLogout,
  required = false,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    if (!token) {
      setError("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Không thể đổi mật khẩu.");
      }

      const updatedUser = data.user
        ? {
            ...user,
            ...data.user,
            mustChangePassword: false,
          }
        : {
            ...user,
            mustChangePassword: false,
          };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      setSuccess(data.message || "Đổi mật khẩu thành công.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (onSuccess) {
        window.setTimeout(() => {
          onSuccess(updatedUser);
        }, 700);
      }
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-card">

        <div className="change-password-brand">
          <div className="change-password-logo">
            <LockKeyhole size={28} />
          </div>

          <span>INTERNAL MANAGEMENT</span>
        </div>

        <div className="change-password-heading">
          <div className="change-password-heading-icon">
            {required ? (
              <ShieldCheck size={27} />
            ) : (
              <KeyRound size={27} />
            )}
          </div>

          <h1>
            {required ? "Thiết lập mật khẩu mới" : "Đổi mật khẩu"}
          </h1>

          <p>
            {required
              ? "Bạn đang sử dụng mật khẩu tạm thời. Vui lòng đổi mật khẩu mới để tiếp tục sử dụng hệ thống."
              : "Cập nhật mật khẩu để bảo vệ tài khoản của bạn."}
          </p>
        </div>

        {user && (
          <div className="change-password-user">
            <div className="change-password-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "N"}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>{user.employeeCode || user.email}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="change-password-message error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="change-password-message success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChange={setCurrentPassword}
            visible={showCurrent}
            setVisible={setShowCurrent}
            placeholder="Nhập mật khẩu hiện tại"
            autoComplete="current-password"
          />

          <PasswordField
            label="Mật khẩu mới"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNew}
            setVisible={setShowNew}
            placeholder="Nhập mật khẩu mới"
          />

          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirm}
            setVisible={setShowConfirm}
            placeholder="Nhập lại mật khẩu mới"
          />

          <div className="change-password-hint">
            <ShieldCheck size={16} />
            Mật khẩu mới phải có ít nhất 8 ký tự.
          </div>

          <button
            type="submit"
            className="change-password-submit"
            disabled={loading || Boolean(success)}
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={19}
                  className="change-password-spin"
                />
                Đang cập nhật...
              </>
            ) : (
              <>
                <LockKeyhole size={18} />
                Xác nhận đổi mật khẩu
              </>
            )}
          </button>
        </form>

        {!required && (
          <button
            type="button"
            className="change-password-logout"
            onClick={onLogout}
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        )}

        <div className="change-password-footer">
          © 2026 Internal Management
        </div>
      </div>
    </div>
  );
}

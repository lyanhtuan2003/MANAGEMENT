
import { useMemo, useRef, useState } from "react";

import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit3,
  Lock,
  Unlock,
  KeyRound,
  X,
  Mail,
  Phone,
  BriefcaseBusiness,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

import "./ManagerAccountants.css";

// ========================================
// API CONFIG
// ========================================

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_BASE_URL = `${RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")}/api`;

// ========================================
// HÀM DÙNG CHUNG
// ========================================

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getAccountantId = (accountant) =>
  accountant?._id || accountant?.id;

const getActiveStatus = (accountant) =>
  accountant?.isActive !== false &&
  accountant?.status !== "locked";

const getErrorMessage = (data, fallback) =>
  data?.message || data?.error || fallback;

const getTemporaryPassword = (data) =>
  data?.credentials?.temporaryPassword ||
  data?.credentials?.tempPassword ||
  data?.temporaryPassword ||
  data?.tempPassword ||
  data?.accountant?.temporaryPassword ||
  data?.accountant?.tempPassword ||
  "";

// ========================================
// COMPONENT
// ========================================

export default function ManagerAccountants({
  accountants = [],
  setAccountants,
  onRefresh,
  loading = false,
  error = "",
}) {
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingAccountant, setEditingAccountant] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [formError, setFormError] = useState("");

  const [notification, setNotification] = useState(null);
  const notificationTimer = useRef(null);

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  const [resetTarget, setResetTarget] = useState(null);

  // ========================================
  // THÔNG BÁO
  // ========================================

  const notify = (message, type = "success") => {
    if (notificationTimer.current) {
      window.clearTimeout(notificationTimer.current);
    }

    setNotification({ message, type });

    notificationTimer.current = window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // ========================================
  // GỌI API
  // ========================================

  const apiRequest = async (url, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        getErrorMessage(data, "Có lỗi xảy ra. Vui lòng thử lại.")
      );
    }

    return data;
  };

  // ========================================
  // LÀM MỚI DANH SÁCH
  // ========================================

  const refreshList = async (fallbackData = null) => {
    if (typeof onRefresh === "function") {
      await onRefresh();
      return;
    }

    if (
      typeof setAccountants === "function" &&
      fallbackData
    ) {
      setAccountants((previous) => {
        const id = getAccountantId(fallbackData);

        const exists = previous.some(
          (item) => getAccountantId(item) === id
        );

        if (exists) {
          return previous.map((item) =>
            getAccountantId(item) === id
              ? fallbackData
              : item
          );
        }

        return [fallbackData, ...previous];
      });
    }
  };

  // ========================================
  // TÌM KIẾM VÀ LỌC
  // ========================================

  const filteredAccountants = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return accountants.filter((accountant) => {
      const matchesKeyword =
        !search ||
        [
          accountant.name,
          accountant.email,
          accountant.phone,
          accountant.employeeCode,
        ].some((value) =>
          String(value || "").toLowerCase().includes(search)
        );

      const active = getActiveStatus(accountant);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "locked" && !active);

      return matchesKeyword && matchesStatus;
    });
  }, [accountants, keyword, statusFilter]);

  const activeCount = accountants.filter(getActiveStatus).length;
  const lockedCount = accountants.length - activeCount;

  // ========================================
  // MỞ FORM THÊM
  // ========================================

  const openCreateModal = () => {
    setEditingAccountant(null);

    setForm({
      name: "",
      email: "",
      phone: "",
    });

    setFormError("");
    setShowModal(true);
  };

  // ========================================
  // MỞ FORM SỬA
  // ========================================

  const openEditModal = (accountant) => {
    setEditingAccountant(accountant);

    setForm({
      name: accountant.name || "",
      email: accountant.email || "",
      phone: accountant.phone || "",
    });

    setFormError("");
    setShowModal(true);
  };

  // ========================================
  // ĐÓNG FORM
  // ========================================

  const closeModal = () => {
    if (formLoading) return;

    setShowModal(false);
    setEditingAccountant(null);
    setFormError("");
  };

  // ========================================
  // INPUT
  // ========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ========================================
  // THÊM / SỬA KẾ TOÁN
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name || !email) {
      setFormError("Vui lòng nhập họ tên và email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setFormError("Địa chỉ email không hợp lệ.");
      return;
    }

    if (
      phone &&
      !/^[0-9+\-()\s.]{8,15}$/.test(phone)
    ) {
      setFormError("Số điện thoại không hợp lệ.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");

      const payload = { name, email, phone };

      let data;

      if (editingAccountant) {
        const id = getAccountantId(editingAccountant);

        data = await apiRequest(`/accountants/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        notify("Cập nhật thông tin kế toán thành công.");
      } else {
        data = await apiRequest("/accountants", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const password = getTemporaryPassword(data);

        if (password) {
          setTemporaryPassword(password);
          setShowPassword(true);
        }

        notify("Tạo tài khoản kế toán thành công.");
      }

      setShowModal(false);
      setEditingAccountant(null);

      await refreshList(data.accountant || null);
    } catch (err) {
      console.error("Save accountant error:", err);

      setFormError(
        err.message || "Không thể lưu thông tin kế toán."
      );
    } finally {
      setFormLoading(false);
    }
  };

  // ========================================
  // KHÓA / MỞ KHÓA
  // ========================================

  const handleToggleLock = async (accountant) => {
    const id = getAccountantId(accountant);
    const isActive = getActiveStatus(accountant);

    if (!id) {
      notify("Không tìm thấy mã tài khoản.", "error");
      return;
    }

    const confirmed = window.confirm(
      isActive
        ? `Bạn có chắc chắn muốn khóa tài khoản ${accountant.name}?`
        : `Bạn có chắc chắn muốn mở khóa tài khoản ${accountant.name}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(id);

      const endpoint = isActive
        ? `/accountants/${id}/lock`
        : `/accountants/${id}/unlock`;

      const data = await apiRequest(endpoint, {
        method: "PATCH",
      });

      notify(
        isActive
          ? "Đã khóa tài khoản kế toán."
          : "Đã mở khóa tài khoản kế toán."
      );

      await refreshList(data.accountant || null);
    } catch (err) {
      console.error("Toggle accountant error:", err);

      notify(
        err.message || "Không thể cập nhật trạng thái tài khoản.",
        "error"
      );
    } finally {
      setActionLoading("");
    }
  };

  // ========================================
  // MỞ XÁC NHẬN ĐẶT LẠI MẬT KHẨU
  // ========================================

  const openResetModal = (accountant) => {
    setResetTarget(accountant);
  };

  // ========================================
  // ĐẶT LẠI MẬT KHẨU
  // ========================================

  const handleResetPassword = async () => {
    if (!resetTarget) return;

    const id = getAccountantId(resetTarget);

    if (!id) {
      notify("Không tìm thấy mã tài khoản.", "error");
      return;
    }

    try {
      setActionLoading(id);

      const data = await apiRequest(
        `/accountants/${id}/reset-password`,
        { method: "PATCH" }
      );

      // QUAN TRỌNG:
      // Backend trả về credentials.temporaryPassword
      const password = getTemporaryPassword(data);

      if (!password) {
        throw new Error(
          "Backend chưa trả về mật khẩu tạm. Vui lòng kiểm tra API reset-password."
        );
      }

      setTemporaryPassword(password);
      setShowPassword(true);
      setResetTarget(null);

      notify("Đã đặt lại mật khẩu thành công.");

      await refreshList(data.accountant || null);
    } catch (err) {
      console.error("Reset accountant password error:", err);

      notify(
        err.message || "Không thể đặt lại mật khẩu.",
        "error"
      );
    } finally {
      setActionLoading("");
    }
  };

  // ========================================
  // SAO CHÉP MẬT KHẨU
  // ========================================

  const copyPassword = async () => {
    if (!temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(temporaryPassword);
      notify("Đã sao chép mật khẩu.");
    } catch {
      notify(
        "Không thể sao chép mật khẩu trên trình duyệt này.",
        "error"
      );
    }
  };

  // ========================================
  // ĐỊNH DẠNG NGÀY
  // ========================================

  const formatDate = (value) => {
    if (!value) return "Chưa cập nhật";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }

    return date.toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  // ========================================
  // ĐÓNG HỘP THOẠI MẬT KHẨU
  // ========================================

  const closePasswordModal = () => {
    setTemporaryPassword("");
    setShowPassword(true);
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <div className="accountants-page">

      {/* HEADER */}
      <div className="accountants-header">
        <div>
          <div className="accountants-breadcrumb">
            Quản lý hệ thống / Nhân sự
          </div>

          <h1>Quản lý kế toán</h1>

          <p>
            Quản lý tài khoản và thông tin nhân sự kế toán của công ty.
          </p>
        </div>

        <div className="accountants-header-actions">
          <button
            type="button"
            className="accountants-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "accountants-spin" : ""}
            />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="accountants-add-btn"
            onClick={openCreateModal}
          >
            <UserPlus size={18} />
            <span>Thêm kế toán</span>
          </button>
        </div>
      </div>

      {/* THỐNG KÊ */}
      <div className="accountants-stats">
        <div className="accountants-stat-card">
          <div className="accountants-stat-icon blue">
            <Users size={23} />
          </div>

          <div>
            <span>Tổng kế toán</span>
            <strong>{accountants.length}</strong>
            <small>Tài khoản trong hệ thống</small>
          </div>
        </div>

        <div className="accountants-stat-card">
          <div className="accountants-stat-icon green">
            <CheckCircle2 size={23} />
          </div>

          <div>
            <span>Đang hoạt động</span>
            <strong>{activeCount}</strong>
            <small>Tài khoản có thể đăng nhập</small>
          </div>
        </div>

        <div className="accountants-stat-card">
          <div className="accountants-stat-icon orange">
            <Lock size={23} />
          </div>

          <div>
            <span>Đã khóa</span>
            <strong>{lockedCount}</strong>
            <small>Tài khoản bị tạm khóa</small>
          </div>
        </div>
      </div>

      {/* DANH SÁCH */}
      <div className="accountants-panel">
        <div className="accountants-panel-heading">
          <div>
            <h2>Danh sách kế toán</h2>
            <p>
              Quản lý thông tin và trạng thái tài khoản kế toán.
            </p>
          </div>

          <span className="accountants-total">
            {filteredAccountants.length} tài khoản
          </span>
        </div>

        {/* TÌM KIẾM */}
        <div className="accountants-toolbar">
          <div className="accountants-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </div>

        {/* LỖI */}
        {error && (
          <div className="accountants-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* LOADING / EMPTY / TABLE */}
        {loading ? (
          <div className="accountants-empty">
            <Loader2 size={28} className="accountants-spin" />
            <p>Đang tải danh sách kế toán...</p>
          </div>
        ) : filteredAccountants.length === 0 ? (
          <div className="accountants-empty">
            <Users size={38} />
            <strong>Không tìm thấy kế toán</strong>
            <p>
              {keyword || statusFilter !== "all"
                ? "Thử thay đổi từ khóa hoặc bộ lọc."
                : "Hiện chưa có tài khoản kế toán nào."}
            </p>
          </div>
        ) : (
          <div className="accountants-table-wrap">
            <table className="accountants-table">
              <thead>
                <tr>
                  <th>Thông tin kế toán</th>
                  <th>Liên hệ</th>
                  <th>Chức vụ</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredAccountants.map((accountant) => {
                  const id = getAccountantId(accountant);
                  const active = getActiveStatus(accountant);
                  const busy = actionLoading === id;

                  return (
                    <tr key={id}>
                      <td>
                        <div className="accountants-person">
                          <div className="accountants-avatar">
                            {(accountant.name || "K")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {accountant.name || "Chưa có tên"}
                            </strong>

                            <small>
                              {accountant.employeeCode || "Kế toán"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="accountants-contact">
                          <span>
                            <Mail size={14} />
                            {accountant.email || "Chưa cập nhật"}
                          </span>

                          <span>
                            <Phone size={14} />
                            {accountant.phone || "Chưa cập nhật"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="accountants-position">
                          <BriefcaseBusiness size={14} />
                          {accountant.position || "Kế toán"}
                        </span>
                      </td>

                      <td>{formatDate(accountant.createdAt)}</td>

                      <td>
                        <span
                          className={`accountants-status ${
                            active ? "active" : "locked"
                          }`}
                        >
                          <span />
                          {active ? "Đang hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      <td>
                        <div className="accountants-actions">
                          <button
                            type="button"
                            title="Chỉnh sửa"
                            className="accountants-action edit"
                            onClick={() => openEditModal(accountant)}
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            title="Đặt lại mật khẩu"
                            className="accountants-action password"
                            disabled={busy || !active}
                            onClick={() => openResetModal(accountant)}
                          >
                            {busy ? (
                              <Loader2
                                size={16}
                                className="accountants-spin"
                              />
                            ) : (
                              <KeyRound size={16} />
                            )}
                          </button>

                          <button
                            type="button"
                            title={active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            className={`accountants-action ${
                              active ? "lock" : "unlock"
                            }`}
                            disabled={busy}
                            onClick={() => handleToggleLock(accountant)}
                          >
                            {busy ? (
                              <Loader2
                                size={16}
                                className="accountants-spin"
                              />
                            ) : active ? (
                              <Lock size={16} />
                            ) : (
                              <Unlock size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA */}
      {showModal && (
        <div
          className="accountants-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="accountants-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="accountants-modal-header">
              <div>
                <h2>
                  {editingAccountant
                    ? "Chỉnh sửa kế toán"
                    : "Thêm kế toán mới"}
                </h2>

                <p>
                  {editingAccountant
                    ? "Cập nhật thông tin tài khoản kế toán."
                    : "Tạo tài khoản đăng nhập cho nhân viên kế toán."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={formLoading}
                className="accountants-modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="accountants-form-group">
                <label>
                  Họ và tên <span>*</span>
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập họ và tên kế toán"
                  maxLength={100}
                  required
                />
              </div>

              <div className="accountants-form-group">
                <label>
                  Email đăng nhập <span>*</span>
                </label>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  required
                />
              </div>

              <div className="accountants-form-group">
                <label>Số điện thoại</label>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                />
              </div>

              {!editingAccountant && (
                <div className="accountants-note">
                  <AlertCircle size={17} />
                  <span>
                    Hệ thống sẽ tạo mật khẩu tạm thời.
                    Kế toán cần đổi mật khẩu sau lần đăng nhập đầu tiên.
                  </span>
                </div>
              )}

              {formError && (
                <div className="accountants-error">
                  <AlertCircle size={17} />
                  {formError}
                </div>
              )}

              <div className="accountants-modal-footer">
                <button
                  type="button"
                  className="accountants-cancel-btn"
                  onClick={closeModal}
                  disabled={formLoading}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="accountants-submit-btn"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <Loader2
                        size={17}
                        className="accountants-spin"
                      />
                      Đang lưu...
                    </>
                  ) : editingAccountant ? (
                    "Lưu thay đổi"
                  ) : (
                    "Tạo tài khoản"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN ĐẶT LẠI MẬT KHẨU */}
      {resetTarget && (
        <div
          className="accountants-modal-overlay"
          onClick={() => {
            if (!actionLoading) setResetTarget(null);
          }}
        >
          <div
            className="accountants-confirm-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="accountants-confirm-icon">
              <KeyRound size={25} />
            </div>

            <h2>Đặt lại mật khẩu?</h2>

            <p>
              Bạn có chắc chắn muốn đặt lại mật khẩu cho
              <strong> {resetTarget.name}</strong>?
            </p>

            <div className="accountants-modal-footer">
              <button
                type="button"
                className="accountants-cancel-btn"
                onClick={() => setResetTarget(null)}
                disabled={!!actionLoading}
              >
                Hủy
              </button>

              <button
                type="button"
                className="accountants-submit-btn"
                onClick={handleResetPassword}
                disabled={!!actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2
                      size={17}
                      className="accountants-spin"
                    />
                    Đang xử lý...
                  </>
                ) : (
                  "Xác nhận"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HIỂN THỊ MẬT KHẨU TẠM */}
      {temporaryPassword && (
        <div className="accountants-modal-overlay">
          <div className="accountants-confirm-modal">
            <div className="accountants-confirm-icon success">
              <CheckCircle2 size={26} />
            </div>

            <h2>Mật khẩu tạm thời</h2>

            <p>
              Hãy gửi mật khẩu này cho kế toán và yêu cầu
              đổi mật khẩu sau khi đăng nhập.
            </p>

            <div className="accountants-password-box">
              <span>
                {showPassword
                  ? temporaryPassword
                  : "••••••••••••"}
              </span>

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>

              <button
                type="button"
                onClick={copyPassword}
                title="Sao chép mật khẩu"
              >
                <Copy size={17} />
              </button>
            </div>

            <button
              type="button"
              className="accountants-submit-btn accountants-password-done"
              onClick={closePasswordModal}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {notification && (
        <div
          className={`accountants-toast ${
            notification.type === "error" ? "error" : "success"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}

          <span>{notification.message}</span>

          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Đóng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

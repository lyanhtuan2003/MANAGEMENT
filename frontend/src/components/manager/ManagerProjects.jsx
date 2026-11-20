
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Users,
  CalendarDays,
  RefreshCw,
  FolderKanban,
} from "lucide-react";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const initialForm = {
  name: "",
  description: "",
  leader: "",
  members: [],
  startDate: "",
  endDate: "",
  progress: 0,
  status: "planning",
};

const statusLabels = {
  planning: "Đang lên kế hoạch",
  active: "Đang thực hiện",
  completed: "Hoàn thành",
  paused: "Tạm dừng",
};

const formatDate = (value) => {
  if (!value) return "Chưa đặt";

  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

// Lấy danh sách từ nhiều dạng response API có thể trả về
const extractList = (data, keys) => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
};

const getMemberId = (member) => {
  if (!member) return "";

  if (typeof member === "string") {
    return member;
  }

  if (typeof member === "object") {
    return String(member._id || member.id || "");
  }

  return String(member);
};

export default function ManagerProjects() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accountants, setAccountants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [deleteProjectConfirm, setDeleteProjectConfirm] =
    useState(null);

  // ========================================
  // GỌI API
  // ========================================

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message || "Không thể thực hiện yêu cầu."
      );
    }

    return data;
  }, []);

  // ========================================
  // LỌC TÀI KHOẢN ĐANG HOẠT ĐỘNG
  // ========================================

  const isAvailableMember = (member) => {
    if (!member) return false;

    if (member.isActive === false) return false;

    if (member.status === "resigned") return false;

    if (member.status === "inactive") return false;

    if (member.status === "locked") return false;

    if (member.isLocked === true) return false;

    return true;
  };

  // ========================================
  // TẢI DỮ LIỆU
  // ========================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [projectData, employeeData, accountantData] =
        await Promise.all([
          apiRequest("/projects/manager"),
          apiRequest("/employees"),
          apiRequest("/accountants"),
        ]);

      // Danh sách dự án
      setProjects(
        Array.isArray(projectData.projects)
          ? projectData.projects
          : []
      );

      // Danh sách nhân viên
      const employeeList = extractList(employeeData, [
        "employees",
        "users",
        "data",
      ]);

      // Danh sách kế toán
      const accountantList = extractList(accountantData, [
        "accountants",
        "employees",
        "users",
        "data",
      ]);

      setEmployees(
        employeeList.filter(isAvailableMember)
      );

      setAccountants(
        accountantList.filter(isAvailableMember)
      );
    } catch (err) {
      setError(
        err.message || "Không thể tải dữ liệu dự án."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // DANH SÁCH NHÂN VIÊN + KẾ TOÁN
  // ========================================

  const projectMembers = useMemo(() => {
    const employeeMembers = employees.map((employee) => ({
      ...employee,
      _id: getMemberId(employee),
      accountType: "employee",
      accountLabel: "Nhân viên",
    }));

    const accountantMembers = accountants.map((accountant) => ({
      ...accountant,
      _id: getMemberId(accountant),
      accountType: "accountant",
      accountLabel: "Kế toán",
    }));

    // Loại bỏ phần tử không có ID
    const allMembers = [
      ...employeeMembers,
      ...accountantMembers,
    ].filter((member) => member._id);

    // Tránh hiển thị trùng ID nếu API trả cùng một tài khoản
    const uniqueMembers = new Map();

    allMembers.forEach((member) => {
      const key = member._id;

      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    });

    return Array.from(uniqueMembers.values());
  }, [employees, accountants]);

  // ========================================
  // TÌM KIẾM VÀ LỌC DỰ ÁN
  // ========================================

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const searchText = [
        project.name,
        project.description,
        project.leader,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesKeyword = searchText.includes(
        keyword.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "all" ||
        project.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [projects, keyword, statusFilter]);

  // ========================================
  // MỞ FORM TẠO DỰ ÁN
  // ========================================

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...initialForm });
    setError("");
    setMessage("");
    setShowModal(true);
  };

  // ========================================
  // MỞ FORM CHỈNH SỬA
  // ========================================

  const openEdit = (project) => {
    setEditingId(project._id);

    setForm({
      name: project.name || "",
      description: project.description || "",
      leader: project.leader || "",

      members: (project.members || [])
        .map(getMemberId)
        .filter(Boolean),

      startDate: project.startDate
        ? String(project.startDate).slice(0, 10)
        : "",

      endDate: project.endDate
        ? String(project.endDate).slice(0, 10)
        : "",

      progress: project.progress ?? 0,
      status: project.status || "planning",
    });

    setError("");
    setMessage("");
    setShowModal(true);
  };

  // ========================================
  // CẬP NHẬT FORM
  // ========================================

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  // ========================================
  // THÊM / BỎ NHÂN VIÊN HOẶC KẾ TOÁN
  // ========================================

  const toggleMember = (id) => {
    const memberId = String(id);

    setForm((previous) => ({
      ...previous,

      members: previous.members.includes(memberId)
        ? previous.members.filter(
            (item) => item !== memberId
          )
        : [...previous.members, memberId],
    }));
  };

  // ========================================
  // TẠO / CẬP NHẬT DỰ ÁN
  // ========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên dự án.");
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      setError(
        "Ngày kết thúc không được trước ngày bắt đầu."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        name: form.name.trim(),
        progress: Number(form.progress),
        members: form.members,
      };

      const data = editingId
        ? await apiRequest(
            `/projects/manager/${editingId}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            }
          )
        : await apiRequest("/projects/manager", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      setShowModal(false);
      setForm({ ...initialForm });

      setMessage(
        data.message || "Lưu dự án thành công."
      );

      await loadData();
    } catch (err) {
      setError(
        err.message || "Không thể lưu dự án."
      );
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // MỞ MODAL XÁC NHẬN XÓA DỰ ÁN
  // ========================================

  const handleDelete = (project) => {
    if (!project || deletingProject) return;

    setError("");
    setMessage("");
    setDeleteProjectConfirm(project);
  };

  // ========================================
  // XÁC NHẬN XÓA DỰ ÁN
  // ========================================

  const confirmDeleteProject = async () => {
    if (!deleteProjectConfirm || deletingProject) return;

    try {
      setDeletingProject(true);
      setError("");
      setMessage("");

      const data = await apiRequest(
        `/projects/manager/${deleteProjectConfirm._id}`,
        {
          method: "DELETE",
        }
      );

      setDeleteProjectConfirm(null);

      setMessage(
        data.message || "Đã xóa dự án thành công."
      );

      await loadData();
    } catch (err) {
      setError(
        err.message || "Không thể xóa dự án."
      );
    } finally {
      setDeletingProject(false);
    }
  };

  // ========================================
  // GIAO DIỆN
  // ========================================

  return (
    <section className="manager-project-page">
      <style>{`
        .manager-project-page {
          width: 100%;
          min-width: 0;
          color: #263047;
        }

        .mp-toolbar {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 190px auto auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          width: 100%;
        }

        .mp-search {
          height: 42px;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          border: 1px solid #e5eaf1;
          border-radius: 9px;
          background: #fff;
          color: #94a3b8;
          transition: 0.2s;
        }

        .mp-search:focus-within {
          border-color: #94a3b8;
          box-shadow: 0 0 0 3px rgba(100,116,139,.08);
        }

        .mp-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #334155;
          font-family: inherit;
          font-size: 12px;
        }

        .mp-search input::placeholder {
          color: #a0a9b8;
        }

        .mp-select {
          width: 190px;
          height: 42px;
          padding: 0 12px;
          border: 1px solid #e5eaf1;
          border-radius: 9px;
          background: #fff;
          color: #475569;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          transition: 0.2s;
        }

        .mp-select:hover {
          border-color: #94a3b8;
        }

        .mp-select:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100,116,139,.1);
        }

        .mp-primary {
          height: 42px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #202d43;
          border-radius: 9px;
          background: #202d43;
          color: #fff;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all .2s ease;
        }

        .mp-primary:hover:not(:disabled) {
          background: #34445f;
          border-color: #34445f;
          box-shadow: 0 4px 10px rgba(32,45,67,.15);
          transform: translateY(-1px);
        }

        .mp-primary:active:not(:disabled) {
          transform: scale(.97);
        }

        .mp-primary:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .mp-icon-btn {
          height: 42px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #fff;
          color: #475569;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all .2s ease;
        }

        .mp-icon-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #1e293b;
        }

        .mp-icon-btn:active:not(:disabled) {
          transform: scale(.97);
        }

        .mp-icon-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .mp-icon-btn.delete {
          color: #dc6470;
          border-color: #f2dfe2;
        }

        .mp-icon-btn.delete:hover {
          background: #fff5f5;
          border-color: #f0b9c0;
          color: #dc3545;
        }

        .mp-alert {
          padding: 12px 15px;
          border-radius: 9px;
          margin-bottom: 15px;
          font-size: 12px;
          line-height: 1.6;
        }

        .mp-error {
          background: #fff1f2;
          color: #dc2626;
        }

        .mp-success {
          background: #ecfdf5;
          color: #16845b;
        }

        .mp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .mp-card {
          min-width: 0;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 13px;
          padding: 19px;
          transition: box-shadow .2s, transform .2s;
        }

        .mp-card:hover {
          box-shadow: 0 6px 20px rgba(15,23,42,.045);
        }

        .mp-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .mp-card h3 {
          margin: 0;
          color: #263047;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .mp-card p {
          margin: 8px 0 0;
          color: #8791a5;
          font-size: 11px;
          line-height: 1.7;
          min-height: 38px;
          overflow-wrap: anywhere;
        }

        .mp-status {
          display: inline-flex;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .mp-status.planning {
          background: #fff4e5;
          color: #c9872e;
        }

        .mp-status.active {
          background: #eaf2ff;
          color: #3986e8;
        }

        .mp-status.completed {
          background: #e8f8f0;
          color: #219e69;
        }

        .mp-status.paused {
          background: #f1f2f6;
          color: #858a9d;
        }

        .mp-progress-info {
          display: flex;
          justify-content: space-between;
          margin: 18px 0 8px;
          font-size: 11px;
          color: #8791a5;
        }

        .mp-progress {
          height: 7px;
          border-radius: 20px;
          background: #edf0f6;
          overflow: hidden;
        }

        .mp-progress-fill {
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(90deg,#3986e8,#70b0f6);
          transition: width .3s ease;
        }

        .mp-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 16px;
          color: #7c879b;
          font-size: 10px;
        }

        .mp-meta span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .mp-members {
          margin-top: 14px;
          padding-top: 13px;
          border-top: 1px solid #f0f2f6;
          font-size: 11px;
          line-height: 1.8;
          color: #64748b;
          overflow-wrap: anywhere;
        }

        .mp-members strong {
          color: #334155;
        }

        .mp-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .mp-actions .mp-icon-btn {
          height: 34px;
          padding: 0 10px;
          font-size: 11px;
        }

        .mp-empty {
          padding: 45px 15px;
          text-align: center;
          color: #9298aa;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 13px;
        }

        .mp-empty svg {
          margin: 0 auto 8px;
        }

        .mp-empty p {
          margin: 5px 0 0;
          font-size: 12px;
        }

        /* MODAL TẠO / CHỈNH SỬA */
        .mp-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          background: rgba(15,23,42,.5);
        }

        .mp-modal {
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          overflow: auto;
          background: #fff;
          border-radius: 15px;
          padding: 23px;
          box-shadow: 0 20px 60px rgba(15,23,42,.2);
        }

        .mp-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .mp-modal-head h2 {
          margin: 0;
          font-size: 18px;
          color: #263047;
        }

        .mp-close {
          border: 0;
          background: #f1f3f7;
          color: #64748b;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .mp-close:hover {
          background: #e8edf5;
        }

        .mp-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .mp-field {
          display: grid;
          gap: 7px;
          margin-bottom: 14px;
          min-width: 0;
        }

        .mp-field.full {
          grid-column: 1 / -1;
        }

        .mp-field label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        .mp-field input:not([type="checkbox"]):not([type="range"]),
        .mp-field textarea,
        .mp-field select {
          width: 100%;
          min-height: 40px;
          padding: 10px 11px;
          border: 1px solid #e5e9f0;
          border-radius: 8px;
          outline: none;
          font-family: inherit;
          font-size: 12px;
          background: #fff;
          color: #334155;
          box-sizing: border-box;
        }

        .mp-field input:focus,
        .mp-field textarea:focus,
        .mp-field select:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100,116,139,.08);
        }

        .mp-field textarea {
          min-height: 85px;
          resize: vertical;
        }

        .mp-field input[type="range"] {
          width: 100%;
          accent-color: #3986e8;
          cursor: pointer;
        }

        .mp-members-list {
          max-height: 230px;
          overflow: auto;
          border: 1px solid #e8edf5;
          border-radius: 8px;
          padding: 9px;
        }

        .mp-member-option {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 8px;
          font-size: 11px;
          color: #475569;
          cursor: pointer;
          border-radius: 6px;
        }

        .mp-member-option:hover {
          background: #f8fafc;
        }

        .mp-member-option input {
          accent-color: #334155;
          flex-shrink: 0;
        }

        .mp-member-option small {
          display: block;
          color: #9298aa;
          margin-top: 3px;
          line-height: 1.5;
        }

        .mp-member-option small strong {
          font-weight: 700;
        }

        .mp-field-hint {
          color: #9298aa;
          font-size: 10px;
          line-height: 1.6;
        }

        .mp-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 20px;
        }

        .mp-cancel {
          height: 40px;
          padding: 0 15px;
          border: 1px solid #e5e9f0;
          border-radius: 8px;
          background: #fff;
          color: #64748b;
          font-family: inherit;
          font-size: 12px;
          cursor: pointer;
        }

        .mp-cancel:hover {
          background: #f8fafc;
        }

        /* MODAL XÓA DỰ ÁN */
        .mp-delete-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.58);
          backdrop-filter: blur(5px);
          animation: mp-delete-fade 0.2s ease;
        }

        .mp-delete-modal {
          width: 100%;
          max-width: 420px;
          padding: 30px;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 18px;
          text-align: center;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
          animation: mp-delete-show 0.25s ease;
        }

        .mp-delete-icon {
          width: 65px;
          height: 65px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc3545;
          background: #fff1f2;
          border: 7px solid #fff7f7;
          border-radius: 50%;
        }

        .mp-delete-modal h2 {
          margin: 0 0 10px;
          color: #263047;
          font-size: 19px;
          font-weight: 750;
        }

        .mp-delete-description {
          margin: 0 auto 20px;
          color: #7c879b;
          font-size: 12px;
          line-height: 1.7;
        }

        .mp-delete-project-name {
          padding: 13px;
          margin-bottom: 17px;
          color: #334155;
          background: #f8fafc;
          border: 1px solid #e5eaf1;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .mp-delete-warning {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px;
          margin-bottom: 22px;
          color: #b45309;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 9px;
          font-size: 11px;
          line-height: 1.6;
          text-align: left;
        }

        .mp-delete-warning svg {
          flex-shrink: 0;
        }

        .mp-delete-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .mp-delete-cancel,
        .mp-delete-confirm {
          min-height: 40px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mp-delete-cancel {
          color: #475569;
          background: #fff;
          border: 1px solid #e2e8f0;
        }

        .mp-delete-cancel:hover {
          background: #f8fafc;
        }

        .mp-delete-confirm {
          color: #fff;
          background: #dc3545;
          border: 1px solid #dc3545;
        }

        .mp-delete-confirm:hover:not(:disabled) {
          background: #bd2635;
          border-color: #bd2635;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
        }

        .mp-delete-confirm:disabled,
        .mp-delete-cancel:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        @keyframes mp-delete-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes mp-delete-show {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .mp-spinning {
          animation: mp-spin 1s linear infinite;
        }

        @keyframes mp-spin {
          to { transform: rotate(360deg); }
        }

        /* TABLET */
        @media (max-width: 1000px) {
          .mp-toolbar {
            grid-template-columns: minmax(0, 1fr) 180px;
          }

          .mp-grid {
            grid-template-columns: 1fr;
          }
        }

        /* MOBILE */
        @media (max-width: 600px) {
          .mp-toolbar {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 9px;
            margin-bottom: 15px;
          }

          .mp-search {
            grid-column: 1 / -1;
            width: 100%;
            height: 39px;
            box-sizing: border-box;
          }

          .mp-select {
            width: 100%;
            height: 36px;
            font-size: 11px;
            padding: 0 8px;
          }

          .mp-primary,
          .mp-toolbar > .mp-icon-btn {
            height: 36px;
            min-height: 36px;
            padding: 0 10px;
            font-size: 11px;
            gap: 5px;
          }

          .mp-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .mp-card {
            padding: 15px;
          }

          .mp-card-head {
            gap: 8px;
          }

          .mp-meta {
            gap: 10px;
          }

          .mp-modal {
            padding: 16px;
            max-height: 92vh;
          }

          .mp-form-grid {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .mp-field.full {
            grid-column: auto;
          }

          .mp-modal-head h2 {
            font-size: 16px;
          }

          .mp-modal-actions {
            position: sticky;
            bottom: -16px;
            padding: 12px 0 0;
            background: #fff;
          }

          .mp-delete-modal {
            padding: 24px 18px 20px;
          }

          .mp-delete-actions {
            flex-direction: column-reverse;
          }

          .mp-delete-cancel,
          .mp-delete-confirm {
            width: 100%;
            min-height: 43px;
          }
        }

        @media (max-width: 380px) {
          .mp-primary,
          .mp-toolbar > .mp-icon-btn {
            padding: 0 8px;
            font-size: 10px;
          }

          .mp-card {
            padding: 13px;
          }

          .mp-status {
            font-size: 9px;
            padding: 5px 7px;
          }
        }
      `}</style>

      {/* THÔNG BÁO */}
      {error && (
        <div className="mp-alert mp-error">
          {error}
        </div>
      )}

      {message && (
        <div className="mp-alert mp-success">
          {message}
        </div>
      )}

      {/* THANH CÔNG CỤ */}
      <div className="mp-toolbar">
        <label className="mp-search">
          <Search size={16} />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm kiếm dự án..."
          />
        </label>

        <select
          className="mp-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="planning">Đang lên kế hoạch</option>
          <option value="active">Đang thực hiện</option>
          <option value="completed">Hoàn thành</option>
          <option value="paused">Tạm dừng</option>
        </select>

        <button
          className="mp-primary"
          type="button"
          onClick={openCreate}
        >
          <Plus size={16} />
          Tạo dự án
        </button>

        <button
          className="mp-icon-btn"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw
            size={14}
            className={loading ? "mp-spinning" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* DANH SÁCH DỰ ÁN */}
      {loading ? (
        <div className="mp-empty">
          Đang tải danh sách dự án...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="mp-empty">
          <FolderKanban size={30} />
          <p>Chưa có dự án phù hợp.</p>
        </div>
      ) : (
        <div className="mp-grid">
          {filteredProjects.map((project) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(project.progress) || 0)
            );

            const members = Array.isArray(project.members)
              ? project.members
              : [];

            const memberNames = members
              .map((member) =>
                typeof member === "object"
                  ? member?.name
                  : ""
              )
              .filter(Boolean);

            return (
              <article className="mp-card" key={project._id}>
                <div className="mp-card-head">
                  <div style={{ minWidth: 0 }}>
                    <h3>{project.name}</h3>

                    <p>
                      {project.description ||
                        "Chưa có mô tả dự án."}
                    </p>
                  </div>

                  <span
                    className={`mp-status ${
                      project.status || "planning"
                    }`}
                  >
                    {statusLabels[project.status] ||
                      project.status ||
                      "Chưa xác định"}
                  </span>
                </div>

                {/* TIẾN ĐỘ */}
                <div className="mp-progress-info">
                  <span>Tiến độ dự án</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="mp-progress">
                  <div
                    className="mp-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* THÔNG TIN */}
                <div className="mp-meta">
                  <span>
                    <Users size={13} />
                    {members.length} thành viên
                  </span>

                  <span>
                    <CalendarDays size={13} />
                    {formatDate(project.startDate)} –{" "}
                    {formatDate(project.endDate)}
                  </span>
                </div>

                <div className="mp-members">
                  <div>
                    <strong>Trưởng dự án:</strong>{" "}
                    {project.leader || "Chưa phân công"}
                  </div>

                  <div>
                    <strong>Thành viên:</strong>{" "}
                    {memberNames.join(", ") || "Chưa có"}
                  </div>
                </div>

                {/* THAO TÁC */}
                <div className="mp-actions">
                  <button
                    className="mp-icon-btn"
                    type="button"
                    onClick={() => openEdit(project)}
                  >
                    <Pencil size={14} />
                    Chỉnh sửa
                  </button>

                  <button
                    className="mp-icon-btn delete"
                    type="button"
                    onClick={() => handleDelete(project)}
                  >
                    <Trash2 size={14} />
                    Xóa dự án
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL TẠO / CHỈNH SỬA */}
      {showModal && (
        <div
          className="mp-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowModal(false);
            }
          }}
        >
          <form className="mp-modal" onSubmit={handleSubmit}>
            <div className="mp-modal-head">
              <h2>
                {editingId
                  ? "Cập nhật dự án"
                  : "Tạo dự án mới"}
              </h2>

              <button
                className="mp-close"
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                aria-label="Đóng"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mp-form-grid">
              {/* TÊN DỰ ÁN */}
              <div className="mp-field full">
                <label>Tên dự án *</label>

                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  placeholder="Nhập tên dự án"
                />
              </div>

              {/* MÔ TẢ */}
              <div className="mp-field full">
                <label>Mô tả</label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  placeholder="Mô tả mục tiêu và nội dung dự án..."
                />
              </div>

              {/* TRƯỞNG DỰ ÁN */}
              <div className="mp-field">
                <label>Trưởng dự án</label>

                <input
                  value={form.leader}
                  onChange={(event) =>
                    updateField("leader", event.target.value)
                  }
                  placeholder="Tên trưởng dự án"
                />
              </div>

              {/* TRẠNG THÁI */}
              <div className="mp-field">
                <label>Trạng thái</label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                >
                  <option value="planning">
                    Đang lên kế hoạch
                  </option>

                  <option value="active">
                    Đang thực hiện
                  </option>

                  <option value="completed">
                    Hoàn thành
                  </option>

                  <option value="paused">
                    Tạm dừng
                  </option>
                </select>
              </div>

              {/* NGÀY BẮT ĐẦU */}
              <div className="mp-field">
                <label>Ngày bắt đầu</label>

                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    updateField("startDate", event.target.value)
                  }
                />
              </div>

              {/* NGÀY KẾT THÚC */}
              <div className="mp-field">
                <label>Ngày kết thúc</label>

                <input
                  type="date"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(event) =>
                    updateField("endDate", event.target.value)
                  }
                />
              </div>

              {/* TIẾN ĐỘ */}
              <div className="mp-field full">
                <label>
                  Tiến độ: {form.progress}%
                </label>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(event) =>
                    updateField("progress", event.target.value)
                  }
                />
              </div>

              {/* NHÂN VIÊN VÀ KẾ TOÁN */}
              <div className="mp-field full">
                <label>
                  Thành viên dự án
                </label>

                <div className="mp-members-list">
                  {projectMembers.length === 0 ? (
                    <p>
                      Chưa có nhân viên hoặc kế toán khả dụng.
                    </p>
                  ) : (
                    projectMembers.map((member) => {
                      const id = String(member._id);

                      return (
                        <label
                          className="mp-member-option"
                          key={`${member.accountType}-${id}`}
                        >
                          <input
                            type="checkbox"
                            checked={form.members.includes(id)}
                            onChange={() => toggleMember(id)}
                          />

                          <span>
                            {member.name || "Chưa có tên"}

                            <small>
                              {member.employeeCode || "Chưa có mã"}
                              {" · "}
                              {member.department || "Chưa có phòng ban"}
                              {" · "}
                              <strong
                                style={{
                                  color:
                                    member.accountType === "accountant"
                                      ? "#0d9488"
                                      : "#3986e8",
                                }}
                              >
                                {member.accountLabel}
                              </strong>
                            </small>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <span className="mp-field-hint">
                  Bạn có thể chọn cả nhân viên và kế toán tham gia
                  dự án. Thành viên được thêm sẽ nhận thông báo
                  trong tài khoản.
                </span>
              </div>
            </div>

            {/* NÚT FORM */}
            <div className="mp-modal-actions">
              <button
                className="mp-cancel"
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                className="mp-primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                  ? "Lưu thay đổi"
                  : "Tạo dự án"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA DỰ ÁN */}
      {deleteProjectConfirm && (
        <div
          className="mp-delete-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingProject
            ) {
              setDeleteProjectConfirm(null);
            }
          }}
        >
          <div
            className="mp-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mp-delete-title"
          >
            <div className="mp-delete-icon">
              <Trash2 size={28} />
            </div>

            <h2 id="mp-delete-title">
              Xác nhận xóa dự án
            </h2>

            <p className="mp-delete-description">
              Bạn có chắc chắn muốn xóa dự án này không?
            </p>

            <div className="mp-delete-project-name">
              {deleteProjectConfirm.name}
            </div>

            <div className="mp-delete-warning">
              <Trash2 size={17} />

              <span>
                Hành động này sẽ xóa dự án khỏi hệ thống.
                Bạn cần cân nhắc trước khi xác nhận.
              </span>
            </div>

            <div className="mp-delete-actions">
              <button
                type="button"
                className="mp-delete-cancel"
                onClick={() => setDeleteProjectConfirm(null)}
                disabled={deletingProject}
              >
                Hủy
              </button>

              <button
                type="button"
                className="mp-delete-confirm"
                onClick={confirmDeleteProject}
                disabled={deletingProject}
              >
                {deletingProject ? (
                  "Đang xóa..."
                ) : (
                  <>
                    <Trash2 size={15} />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

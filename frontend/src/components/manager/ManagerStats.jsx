
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  CalendarClock,
  FolderKanban,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken");

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.accountants)) return data.accountants;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
};

async function fetchData(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Không thể tải ${path}`);
  }

  return data;
}

const isActiveAccount = (employee) => {
  if (employee.isActive === false) return false;

  return !["resigned", "locked", "inactive"].includes(
    String(employee.status || "").toLowerCase()
  );
};

const isPendingLeave = (request) =>
  ["pending", "Chờ duyệt"].includes(request.status);

const isRunningProject = (project) =>
  !["completed", "cancelled", "Đã hoàn thành", "Đã hủy"].includes(
    project.status
  );

export default function ManagerStats({
  employees = [],
  requests = [],
  projects: initialProjects = [],
}) {
  const [accountants, setAccountants] = useState([]);
  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    let cancelled = false;

    const loadExtraData = async () => {
      const token = getToken();

      if (!token) {
        setError("Không tìm thấy token đăng nhập.");
        return;
      }

      setLoading(true);
      setError("");

      const [accountantResult, projectResult] = await Promise.allSettled([
        fetchData("/accountants", token),
        fetchData("/projects", token),
      ]);

      if (cancelled) return;

      if (accountantResult.status === "fulfilled") {
        setAccountants(getList(accountantResult.value));
      } else {
        console.error(
          "Không thể tải danh sách kế toán:",
          accountantResult.reason
        );
        setAccountants([]);
      }

      if (projectResult.status === "fulfilled") {
        setProjects(getList(projectResult.value));
      } else {
        console.error(
          "Không thể tải danh sách dự án:",
          projectResult.reason
        );

        // Nếu API dự án chưa hoạt động thì không dùng số liệu mẫu
        setProjects([]);
      }

      if (
        accountantResult.status === "rejected" ||
        projectResult.status === "rejected"
      ) {
        setError("Một số dữ liệu tổng quan chưa tải được từ máy chủ.");
      }

      setLoading(false);
    };

    loadExtraData();

    return () => {
      cancelled = true;
    };
  }, []);

  const allEmployees = [...employees, ...accountants];

  const totalEmployees = allEmployees.length;

  const activeEmployees = allEmployees.filter(isActiveAccount).length;

  const pendingLeaves = requests.filter(isPendingLeave).length;

  const runningProjects = projects.filter(isRunningProject).length;

  const stats = [
    {
      title: "Tổng nhân viên",
      value: totalEmployees,
      note: "Bao gồm nhân viên và kế toán",
      icon: Users,
      color: "blue",
    },
    {
      title: "Đang làm việc",
      value: activeEmployees,
      note: "Tài khoản đang hoạt động",
      icon: UserCheck,
      color: "green",
    },
    {
      title: "Đơn nghỉ chờ duyệt",
      value: String(pendingLeaves).padStart(2, "0"),
      note: "Các yêu cầu cần xử lý",
      icon: CalendarClock,
      color: "orange",
    },
    {
      title: "Dự án đang chạy",
      value: runningProjects,
      note: "Dự án chưa hoàn thành",
      icon: FolderKanban,
      color: "purple",
    },
  ];

  return (
    <div>
      {loading && (
        <p className="manager-data-message">
          Đang cập nhật số liệu tổng quan...
        </p>
      )}

      {error && (
        <p className="manager-data-error">
          {error}
        </p>
      )}

      <div className="manager-stats">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="manager-stat-card" key={item.title}>
              <div className={`stat-icon ${item.color}`}>
                <Icon size={23} />
              </div>

              <div className="stat-content">
                <span>{item.title}</span>
                <h2>{item.value}</h2>
                <small>{item.note}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

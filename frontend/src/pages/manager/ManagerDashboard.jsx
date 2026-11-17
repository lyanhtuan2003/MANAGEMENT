
import { useState } from "react";

import ManagerSidebar from "../../components/manager/ManagerSidebar";
import ManagerHeader from "../../components/manager/ManagerHeader";
import ManagerStats from "../../components/manager/ManagerStats";
import ManagerEmployees from "../../components/manager/ManagerEmployees";
import ManagerLeaveRequests from "../../components/manager/ManagerLeaveRequests";
import ManagerProjects from "../../components/manager/ManagerProjects";
import ManagerRewards from "../../components/manager/ManagerRewards";

import {
  managerEmployees,
  initialLeaveRequests,
  initialProjects,
} from "../../data/managerData";

import "./manager.css";

export default function ManagerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [open, setOpen] = useState(false);

  const [employees, setEmployees] = useState(managerEmployees);
  const [requests, setRequests] = useState(initialLeaveRequests);
  const [projects, setProjects] = useState(initialProjects);

  const titles = {
    overview: "Tổng quan hệ thống",
    employees: "Quản lý nhân viên",
    leaves: "Quản lý đơn nghỉ phép",
    projects: "Quản lý dự án",
    rewards: "Quản lý thưởng và phạt",
  };

  return (
    <div className="manager-layout">
      <ManagerSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        open={open}
        setOpen={setOpen}
      />

      <main className="manager-main">
        <ManagerHeader setOpen={setOpen} />

        <div className="manager-content">
          <div className="manager-page-title">
            <div>
              <span className="breadcrumb">Internal Management / Sếp</span>
              <h1>{titles[activeTab]}</h1>
              <p>Chào mừng bạn trở lại hệ thống quản lý nội bộ.</p>
            </div>

            <div className="today-label">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
          </div>

          {activeTab === "overview" && (
            <>
              <ManagerStats />

              <div className="overview-grid">
                <div className="manager-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Đơn nghỉ chờ duyệt</h2>
                      <p>Các yêu cầu cần được xử lý</p>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setActiveTab("leaves")}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {requests.filter((r) => r.status === "Chờ duyệt").length === 0 ? (
                    <div className="empty-state">Không có đơn chờ duyệt</div>
                  ) : (
                    requests
                      .filter((r) => r.status === "Chờ duyệt")
                      .slice(0, 4)
                      .map((r) => (
                        <div className="overview-leave" key={r.id}>
                          <div className="avatar">
                            {r.employee.charAt(0)}
                          </div>
                          <div className="overview-leave-info">
                            <strong>{r.employee}</strong>
                            <span>{r.type} · {r.from}</span>
                          </div>
                          <span className="status-badge pending">
                            Chờ duyệt
                          </span>
                        </div>
                      ))
                  )}
                </div>

                <div className="manager-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Tiến độ dự án</h2>
                      <p>Tình hình các dự án hiện tại</p>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setActiveTab("projects")}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {projects.slice(0, 4).map((p) => (
                    <div className="overview-project" key={p.id}>
                      <div className="overview-project-heading">
                        <strong>{p.name}</strong>
                        <span>{p.progress}%</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="manager-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Nhân viên mới nhất</h2>
                    <p>Danh sách nhân sự trong hệ thống</p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => setActiveTab("employees")}
                  >
                    Quản lý nhân viên
                  </button>
                </div>

                <div className="responsive-table">
                  <table className="manager-table">
                    <thead>
                      <tr>
                        <th>Nhân viên</th>
                        <th>Phòng ban</th>
                        <th>Chức vụ</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.slice(0, 4).map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div className="employee-cell">
                              <div className="avatar">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <strong>{emp.name}</strong>
                                <small>{emp.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>{emp.department}</td>
                          <td>{emp.position}</td>
                          <td>
                            <span className="status-badge approved">
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "employees" && (
            <ManagerEmployees
              employees={employees}
              setEmployees={setEmployees}
            />
          )}

          {activeTab === "leaves" && (
            <ManagerLeaveRequests
              requests={requests}
              setRequests={setRequests}
            />
          )}

          {activeTab === "projects" && (
            <ManagerProjects
              projects={projects}
              setProjects={setProjects}
            />
          )}

          {activeTab === "rewards" && (
            <ManagerRewards employees={employees} />
          )}
        </div>
      </main>
    </div>
  );
}

import { CalendarDays, Users, BriefcaseBusiness } from "lucide-react";
import { projects } from "../../data/employeeData";
import ProgressBar from "../common/ProgressBar";

export default function MyProjects() {
  return (
    <div className="employee-page">
      <div className="employee-section-title">
        <h1>Dự án của tôi</h1>
        <p>Các dự án mà bạn được phân công tham gia.</p>
      </div>

      <div className="employee-project-list">
        {projects.map((project) => (
          <div className="employee-panel employee-project-card" key={project.id}>
            <div className="project-card-top">
              <span className="project-code">{project.id}</span>

              <span
                className={`project-status ${
                  project.progress === 100 ? "completed" : ""
                }`}
              >
                {project.status}
              </span>
            </div>

            <div className="project-main-icon">
              <BriefcaseBusiness size={24} />
            </div>

            <h2>{project.name}</h2>
            <p>{project.description}</p>

            <div className="project-progress-info">
              <span>Tiến độ hoàn thành</span>
              <strong>{project.progress}%</strong>
            </div>

            <ProgressBar progress={project.progress} />

            <div className="project-card-footer">
              <span>
                <Users size={15} />
                {project.members} thành viên
              </span>

              <span>
                <CalendarDays size={15} />
                {project.deadline}
              </span>
            </div>

            <div className="project-leader">
              Người phụ trách: <strong>{project.leader}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
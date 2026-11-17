import {
  Clock,
  Wallet,
  CalendarCheck,
  BriefcaseBusiness,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";

import StatCard from "../common/StatCard";
import ProgressBar from "../common/ProgressBar";

import {
  employeeData,
  projects,
  attendanceHistory,
} from "../../data/employeeData";

export default function EmployeeOverview({
  setActivePage,
  checkIn,
  checkOut,
  checkedIn,
  checkedOut,
}) {
  const currentDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="employee-page">
      <div className="employee-welcome">
        <div>
          <span className="welcome-label">CHÀO MỪNG BẠN TRỞ LẠI</span>
          <h1>Xin chào, Nguyễn Văn An! 👋</h1>
          <p>Chúc bạn có một ngày làm việc thật hiệu quả.</p>
        </div>

        <div className="welcome-date">
          <CalendarDays size={19} />
          {currentDate}
        </div>
      </div>

      <div className="employee-stats-grid">
        <StatCard
          title="Ngày công tháng này"
          value={`${employeeData.workingDays}/${employeeData.totalWorkingDays}`}
          description="Ngày công đã ghi nhận"
          icon={CalendarCheck}
          color="blue"
        />

        <StatCard
          title="Lương dự kiến"
          value={`${(employeeData.basicSalary / 1000000).toFixed(1)}tr`}
          description="Lương cơ bản"
          icon={Wallet}
          color="green"
        />

        <StatCard
          title="Đơn xin nghỉ"
          value="01"
          description="Đang chờ phê duyệt"
          icon={CalendarDays}
          color="orange"
        />

        <StatCard
          title="Dự án tham gia"
          value={projects.length}
          description="Dự án được phân công"
          icon={BriefcaseBusiness}
          color="purple"
        />
      </div>

      <div className="employee-content-grid">
        <section className="employee-panel attendance-panel">
          <div className="employee-panel-heading">
            <div>
              <h2>Chấm công hôm nay</h2>
              <p>Ghi nhận thời gian làm việc của bạn</p>
            </div>

            <span className="live-status">
              <i />
              Hôm nay
            </span>
          </div>

          <div className="attendance-time">
            <div className="attendance-time-box">
              <span>GIỜ VÀO</span>
              <h2>{checkedIn || "--:--"}</h2>
            </div>

            <div className="attendance-time-divider" />

            <div className="attendance-time-box">
              <span>GIỜ RA</span>
              <h2>{checkedOut || "--:--"}</h2>
            </div>
          </div>

          <div className="attendance-actions">
            <button
              className="attendance-button check-in-button"
              disabled={checkedIn}
              onClick={checkIn}
            >
              <Clock size={17} />
              {checkedIn ? "Đã chấm công vào" : "Chấm công vào"}
            </button>

            <button
              className="attendance-button check-out-button"
              disabled={!checkedIn || checkedOut}
              onClick={checkOut}
            >
              <ArrowUpRight size={17} />
              {checkedOut ? "Đã chấm công ra" : "Chấm công ra"}
            </button>
          </div>

          <p className="attendance-note">
            * Thời gian chấm công hiện tại là dữ liệu demo trên trình duyệt.
          </p>
        </section>

        <section className="employee-panel salary-panel">
          <div className="employee-panel-heading">
            <div>
              <h2>Thu nhập tháng này</h2>
              <p>Tháng 11/2026</p>
            </div>

            <div className="salary-icon">
              <Wallet size={21} />
            </div>
          </div>

          <div className="salary-total">
            <span>Tổng thu nhập dự kiến</span>
            <h1>
              {(
                employeeData.basicSalary +
                employeeData.allowance +
                employeeData.bonus -
                employeeData.penalty
              ).toLocaleString("vi-VN")}{" "}
              <small>đ</small>
            </h1>
          </div>

          <div className="salary-detail">
            <div>
              <span>Lương cơ bản</span>
              <strong>
                {employeeData.basicSalary.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div>
              <span>Phụ cấp</span>
              <strong>
                +{employeeData.allowance.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div>
              <span>Thưởng</span>
              <strong className="text-green">
                +{employeeData.bonus.toLocaleString("vi-VN")} đ
              </strong>
            </div>

            <div>
              <span>Phạt</span>
              <strong className="text-red">
                -{employeeData.penalty.toLocaleString("vi-VN")} đ
              </strong>
            </div>
          </div>

          <button
            className="salary-detail-button"
            onClick={() => setActivePage("payroll")}
          >
            Xem bảng lương chi tiết
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>

      <section className="employee-panel projects-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Dự án của tôi</h2>
            <p>Các dự án bạn đang được phân công</p>
          </div>

          <button
            className="view-all-button"
            onClick={() => setActivePage("projects")}
          >
            Xem tất cả <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="project-grid">
          {projects.slice(0, 2).map((project) => (
            <div className="employee-project-card" key={project.id}>
              <div className="project-card-top">
                <span className="project-code">{project.id}</span>
                <span className="project-status">
                  {project.status}
                </span>
              </div>

              <h3>{project.name}</h3>
              <p>{project.description}</p>

              <div className="project-progress-info">
                <span>Tiến độ</span>
                <strong>{project.progress}%</strong>
              </div>

              <ProgressBar progress={project.progress} />

              <div className="project-card-footer">
                <span>
                  <CalendarDays size={14} />
                  {project.deadline}
                </span>

                <span>{project.members} thành viên</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="employee-panel recent-attendance">
        <div className="employee-panel-heading">
          <div>
            <h2>Lịch sử chấm công gần đây</h2>
            <p>Theo dõi thời gian làm việc của bạn</p>
          </div>

          <button
            className="view-all-button"
            onClick={() => setActivePage("attendance")}
          >
            Xem tất cả
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="employee-table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                <th>NGÀY</th>
                <th>GIỜ VÀO</th>
                <th>GIỜ RA</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>

            <tbody>
              {attendanceHistory.slice(0, 3).map((item, index) => (
                <tr key={index}>
                  <td>{item.date}</td>
                  <td>{item.checkIn}</td>
                  <td>{item.checkOut}</td>
                  <td>
                    <span className="attendance-status">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
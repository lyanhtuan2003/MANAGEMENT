import { Clock, CalendarDays } from "lucide-react";
import { attendanceHistory } from "../../data/employeeData";

export default function Attendance({
  checkIn,
  checkOut,
  checkedIn,
  checkedOut,
}) {
  return (
    <div className="employee-page">
      <div className="employee-section-title">
        <h1>Chấm công</h1>
        <p>Quản lý thời gian làm việc và lịch sử chấm công.</p>
      </div>

      <div className="employee-panel attendance-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Chấm công hôm nay</h2>
            <p>Ghi nhận giờ vào và giờ ra của bạn.</p>
          </div>
          <Clock color="#3986e8" size={24} />
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
            Chấm công vào
          </button>

          <button
            className="attendance-button check-out-button"
            disabled={!checkedIn || checkedOut}
            onClick={checkOut}
          >
            Chấm công ra
          </button>
        </div>
      </div>

      <section className="employee-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Lịch sử chấm công</h2>
            <p>Danh sách các lần chấm công gần đây.</p>
          </div>
          <CalendarDays color="#3986e8" />
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
              {attendanceHistory.map((item, index) => (
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
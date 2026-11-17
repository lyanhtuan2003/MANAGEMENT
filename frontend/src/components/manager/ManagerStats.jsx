
import {
  Users,
  UserCheck,
  CalendarClock,
  FolderKanban,
} from "lucide-react";

const stats = [
  {
    title: "Tổng nhân viên",
    value: "48",
    note: "Nhân sự toàn công ty",
    icon: Users,
    color: "blue",
  },
  {
    title: "Đang làm việc",
    value: "42",
    note: "Nhân viên hoạt động",
    icon: UserCheck,
    color: "green",
  },
  {
    title: "Đơn nghỉ chờ duyệt",
    value: "06",
    note: "Cần xử lý",
    icon: CalendarClock,
    color: "orange",
  },
  {
    title: "Dự án đang chạy",
    value: "08",
    note: "Dự án hiện tại",
    icon: FolderKanban,
    color: "purple",
  },
];

export default function ManagerStats() {
  return (
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
  );
}

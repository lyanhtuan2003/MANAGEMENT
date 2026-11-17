
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FolderKanban,
  Gift,
  X,
  BriefcaseBusiness,
} from "lucide-react";

const menus = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "employees", label: "Quản lý nhân viên", icon: Users },
  { id: "leaves", label: "Duyệt đơn nghỉ", icon: CalendarCheck },
  { id: "projects", label: "Quản lý dự án", icon: FolderKanban },
  { id: "rewards", label: "Thưởng & phạt", icon: Gift },
];

export default function ManagerSidebar({
  activeTab,
  setActiveTab,
  open,
  setOpen,
}) {
  return (
    <>
      {open && (
        <div className="manager-overlay" onClick={() => setOpen(false)} />
      )}

      <aside className={`manager-sidebar ${open ? "show" : ""}`}>
        <div className="manager-brand">
          <div className="brand-icon">
            <BriefcaseBusiness size={23} />
          </div>
          <div>
            <h2>Internal</h2>
            <span>Management System</span>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-section">QUẢN LÝ</div>

        <nav className="manager-nav">
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`manager-nav-item ${
                  activeTab === item.id ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(item.id);
                  setOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="manager-profile-mini">
            <div className="avatar">S</div>
            <div>
              <strong>Quản trị viên</strong>
              <span>Quản lý hệ thống</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

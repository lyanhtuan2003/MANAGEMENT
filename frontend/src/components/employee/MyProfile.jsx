import { UserRound, Mail, Phone, BriefcaseBusiness, CalendarDays } from "lucide-react";
import { employeeData } from "../../data/employeeData";

export default function MyProfile() {
  const profileItems = [
    { label: "Mã nhân viên", value: employeeData.id, icon: UserRound },
    { label: "Họ và tên", value: employeeData.name, icon: UserRound },
    { label: "Email", value: employeeData.email, icon: Mail },
    { label: "Số điện thoại", value: employeeData.phone, icon: Phone },
    { label: "Phòng ban", value: employeeData.department, icon: BriefcaseBusiness },
    { label: "Chức vụ", value: employeeData.position, icon: BriefcaseBusiness },
    { label: "Ngày vào làm", value: employeeData.joinDate, icon: CalendarDays },
  ];

  return (
    <div className="employee-page">
      <div className="employee-section-title">
        <h1>Hồ sơ cá nhân</h1>
        <p>Thông tin tài khoản và hồ sơ nhân viên.</p>
      </div>

      <section className="employee-panel profile-panel">
        <div className="profile-cover" />

        <div className="profile-main">
          <div className="profile-large-avatar">AN</div>
          <h2>{employeeData.name}</h2>
          <p>{employeeData.position}</p>
          <span className="profile-active">Đang làm việc</span>
        </div>

        <div className="profile-information">
          {profileItems.map((item) => {
            const Icon = item.icon;

            return (
              <div className="profile-information-item" key={item.label}>
                <div className="profile-information-icon">
                  <Icon size={19} />
                </div>

                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export const employeeData = {
  id: "NV001",
  name: "Nguyễn Văn An",
  email: "nguyenvanan@gmail.com",
  phone: "0987654321",
  department: "Marketing",
  position: "Nhân viên Marketing",
  joinDate: "01/06/2026",
  avatar: "AN",
  basicSalary: 12000000,
  allowance: 1000000,
  bonus: 500000,
  penalty: 0,
  workingDays: 22,
  totalWorkingDays: 26,
};

export const projects = [
  {
    id: "DA001",
    name: "Website Internal Management",
    description: "Phát triển hệ thống quản lý nội bộ doanh nghiệp.",
    leader: "Trần Minh Tuấn",
    deadline: "30/12/2026",
    progress: 75,
    status: "Đang thực hiện",
    members: 5,
  },
  {
    id: "DA002",
    name: "Marketing Campaign 2026",
    description: "Xây dựng và triển khai chiến dịch Marketing.",
    leader: "Nguyễn Hoàng Nam",
    deadline: "20/12/2026",
    progress: 45,
    status: "Đang thực hiện",
    members: 4,
  },
  {
    id: "DA003",
    name: "Brand Identity",
    description: "Xây dựng bộ nhận diện thương hiệu mới.",
    leader: "Lê Minh Anh",
    deadline: "15/11/2026",
    progress: 100,
    status: "Hoàn thành",
    members: 3,
  },
];

export const attendanceHistory = [
  { date: "16/11/2026", checkIn: "08:30", checkOut: "--:--", status: "Đang làm việc" },
  { date: "15/11/2026", checkIn: "08:25", checkOut: "17:35", status: "Đúng giờ" },
  { date: "14/11/2026", checkIn: "08:40", checkOut: "17:30", status: "Đi muộn" },
  { date: "13/11/2026", checkIn: "08:28", checkOut: "17:32", status: "Đúng giờ" },
];

export const leaveHistory = [
  {
    id: "NP001",
    type: "Nghỉ phép năm",
    from: "20/11/2026",
    to: "21/11/2026",
    reason: "Giải quyết công việc cá nhân",
    status: "pending",
  },
  {
    id: "NP002",
    type: "Nghỉ việc riêng",
    from: "05/11/2026",
    to: "05/11/2026",
    reason: "Có việc gia đình",
    status: "approved",
  },
];
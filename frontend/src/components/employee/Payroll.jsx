import { Wallet, Download, TrendingUp } from "lucide-react";
import { employeeData } from "../../data/employeeData";

export default function Payroll() {
  const total =
    employeeData.basicSalary +
    employeeData.allowance +
    employeeData.bonus -
    employeeData.penalty;

  const formatMoney = (value) =>
    value.toLocaleString("vi-VN") + " đ";

  return (
    <div className="employee-page">
      <div className="employee-section-title">
        <h1>Bảng lương của tôi</h1>
        <p>Thông tin thu nhập và các khoản khấu trừ.</p>
      </div>

      <div className="employee-panel payroll-highlight">
        <div className="payroll-highlight-icon">
          <Wallet size={26} />
        </div>

        <span>TỔNG THU NHẬP DỰ KIẾN - THÁNG 11/2026</span>

        <h1>{formatMoney(total)}</h1>

        <p>
          <TrendingUp size={15} />
          Lương dự kiến, chưa phải bảng lương đã chốt
        </p>
      </div>

      <div className="employee-panel">
        <div className="employee-panel-heading">
          <div>
            <h2>Chi tiết thu nhập</h2>
            <p>Tháng 11/2026</p>
          </div>
        </div>

        <div className="payroll-list">
          <div>
            <span>Lương cơ bản</span>
            <strong>{formatMoney(employeeData.basicSalary)}</strong>
          </div>

          <div>
            <span>Phụ cấp</span>
            <strong className="text-green">
              +{formatMoney(employeeData.allowance)}
            </strong>
          </div>

          <div>
            <span>Tiền thưởng</span>
            <strong className="text-green">
              +{formatMoney(employeeData.bonus)}
            </strong>
          </div>

          <div>
            <span>Khoản phạt</span>
            <strong className="text-red">
              -{formatMoney(employeeData.penalty)}
            </strong>
          </div>

          <div className="payroll-final">
            <span>Tổng thu nhập</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
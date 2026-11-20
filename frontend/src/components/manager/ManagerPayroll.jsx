

import { useCallback, useEffect, useMemo, useState } from "react";



import {

  Users,

  CalendarCheck,

  Gift,

  Wallet,

  RefreshCw,

  Search,

  Eye,

  X,

  Clock,

  CheckCircle2,

  AlertCircle,

  PlusCircle,

  Banknote,
  Copy,
} from "lucide-react";



import "./ManagerPayroll.css";



// =====================================================

// API CONFIG

// =====================================================



const RAW_API_URL =

  import.meta.env.VITE_API_URL || "http://localhost:5000";



const API_URL = `${RAW_API_URL.replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;



const getToken = () =>

  localStorage.getItem("token") ||

  localStorage.getItem("authToken") ||

  localStorage.getItem("accessToken");



// =====================================================

// FORMAT

// =====================================================



const money = (value) =>

  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;



const numberFormat = (value) =>

  Number(value || 0).toLocaleString("vi-VN");



const getCurrentMonth = () => {

  const now = new Date();



  return `${now.getFullYear()}-${String(

    now.getMonth() + 1

  ).padStart(2, "0")}`;

};



const getSelectedMonthText = (value) => {

  const [year, month] = value.split("-");

  return `${month}/${year}`;

};



// =====================================================

// STAT CARD

// =====================================================



function StatCard({

  icon: Icon,

  title,

  value,

  color,

  note,

  isMoney = false,

}) {

  return (

    <div className="manager-stat-card">

      <div className={`stat-icon ${color}`}>

        <Icon size={22} />

      </div>



      <div className="stat-content">

        <span>{title}</span>



        <h2>

          {isMoney ? money(value) : numberFormat(value)}

        </h2>



        <small>{note}</small>

      </div>

    </div>

  );

}



// =====================================================

// MAIN COMPONENT

// =====================================================



export default function ManagerPayroll() {

  const [month, setMonth] = useState(getCurrentMonth);



  const [employees, setEmployees] = useState([]);

  const [summary, setSummary] = useState({});



  const [keyword, setKeyword] = useState("");



  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");



  const [selectedItem, setSelectedItem] = useState(null);
  const [paymentConfirmItem, setPaymentConfirmItem] = useState(null);



  const [creatingId, setCreatingId] = useState("");

  const [payingId, setPayingId] = useState("");



  // ===================================================

  // API REQUEST

  // ===================================================



  const request = useCallback(async (url, options = {}) => {

    const token = getToken();



    if (!token) {

      throw new Error(

        "Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại."

      );

    }



    const {

      method = "GET",

      body,

      signal,

    } = options;



    const response = await fetch(`${API_URL}${url}`, {

      method,

      headers: {

        Authorization: `Bearer ${token}`,

        "Content-Type": "application/json",

      },

      ...(body !== undefined

        ? { body: JSON.stringify(body) }

        : {}),

      ...(signal ? { signal } : {}),

    });



    const result = await response.json().catch(() => ({}));



    if (!response.ok || result.success === false) {

      throw new Error(

        result.message || `Lỗi máy chủ (${response.status}).`

      );

    }



    return result;

  }, []);



  // ===================================================

  // LOAD PAYROLL

  // GET /api/payroll/manager?month=&year=

  // ===================================================



  const loadPayroll = useCallback(

    async (signal) => {

      try {

        setLoading(true);

        setError("");



        const [year, selectedMonth] = month.split("-");



        if (

          !year ||

          !selectedMonth ||

          Number(selectedMonth) < 1 ||

          Number(selectedMonth) > 12

        ) {

          throw new Error("Vui lòng chọn tháng hợp lệ.");

        }



        const params = new URLSearchParams({

          month: String(Number(selectedMonth)),

          year: String(Number(year)),

        });



        const result = await request(

          `/payroll/manager?${params.toString()}`,

          { signal }

        );



        if (signal?.aborted) return;



        if (

          Number(result.month) !== Number(selectedMonth) ||

          Number(result.year) !== Number(year)

        ) {

          throw new Error(

            "Dữ liệu trả về không đúng tháng đã chọn."

          );

        }



        const list = Array.isArray(result.payrolls)

          ? result.payrolls

          : [];



        setEmployees(list);

        setSummary(result.summary || {});



        setSelectedItem((current) => {

          if (!current) return null;



          const currentId = String(current.employee?._id || "");



          return (

            list.find(

              (item) =>

                String(item.employee?._id || "") === currentId

            ) || null

          );

        });

      } catch (err) {

        if (err.name === "AbortError") return;



        setError(

          err.message || "Không thể tải dữ liệu bảng lương."

        );



        setEmployees([]);

        setSummary({});

        setSelectedItem(null);

      } finally {

        if (!signal?.aborted) {

          setLoading(false);

        }

      }

    },

    [month, request]

  );



  // ===================================================

  // AUTO LOAD WHEN MONTH CHANGES

  // ===================================================



  useEffect(() => {

    const controller = new AbortController();



    loadPayroll(controller.signal);



    return () => {

      controller.abort();

    };

  }, [loadPayroll]);



  // ===================================================

  // FILTER EMPLOYEES

  // ===================================================



  const filteredEmployees = useMemo(() => {

    const search = keyword.trim().toLowerCase();



    return employees.filter((item) => {

      const employee = item.employee || {};



      const content = [

        employee.name,

        employee.employeeCode,

        employee.department,

        employee.position,

      ]

        .join(" ")

        .toLowerCase();



      return !search || content.includes(search);

    });

  }, [employees, keyword]);



  // ===================================================

  // CREATE PAYROLL

  // POST /api/payroll/manager

  // ===================================================



  const handleCreatePayroll = async (item) => {

    const employee = item.employee || {};

    const employeeId = employee._id;



    if (!employeeId) {

      setError("Không tìm thấy ID nhân viên.");

      return;

    }



    if (item.status !== "not_created" || item.payroll?._id) {

      setError("Bảng lương nhân viên này đã được tạo.");

      return;

    }



    if (creatingId || payingId) return;



    const [year, selectedMonth] = month.split("-");



    try {

      setCreatingId(String(employeeId));

      setError("");

      setSuccess("");



      const result = await request("/payroll/manager", {

        method: "POST",

        body: {

          employeeId,

          month: Number(selectedMonth),

          year: Number(year),



          // Mặc định phụ cấp bằng 0.

          // Có thể cập nhật sau khi tạo.

          allowance: 0,



          // Khấu trừ bổ sung mặc định bằng 0.

          additionalDeduction: 0,



          note: "",

        },

      });



      setSuccess(

        result.message ||

          `Đã tạo bảng lương cho ${employee.name || "nhân viên"}.`

      );



      // Tải lại dữ liệu để trạng thái chuyển sang Chờ trả.

      await loadPayroll();

    } catch (err) {

      setError(err.message || "Không thể tạo bảng lương.");

    } finally {

      setCreatingId("");

    }

  };



  // ===================================================

  // MARK PAYROLL PAID

  // PATCH /api/payroll/manager/:id/pay

  // ===================================================



  const handleMarkPaid = (item) => {
    const payrollId = item.payroll?._id;

    if (!payrollId) {
      setError("Không tìm thấy mã bảng lương.");
      return;
    }

    if (item.status === "paid") {
      setError("Bảng lương này đã được thanh toán.");
      return;
    }

    if (creatingId || payingId) return;

    setError("");
    setPaymentConfirmItem(item);
  };

  const confirmMarkPaid = async () => {
    const payrollId = paymentConfirmItem?.payroll?._id;
    if (!payrollId || payingId) return;

    try {
      setPayingId(String(payrollId));
      setError("");
      setSuccess("");

      const result = await request(
        `/payroll/manager/${payrollId}/pay`,
        { method: "PATCH" }
      );

      setSuccess(result.message || "Xác nhận thanh toán thành công.");
      setPaymentConfirmItem(null);
      await loadPayroll();
    } catch (err) {
      setError(err.message || "Không thể xác nhận thanh toán.");
    } finally {
      setPayingId("");
    }
  };

  // ===================================================

  // REFRESH

  // ===================================================



  const handleRefresh = () => {

    setSuccess("");

    loadPayroll();

  };



  // ===================================================

  // OPEN / CLOSE DETAIL

  // ===================================================



  const openDetail = (item) => {

    setSelectedItem(item);

  };



  const closeDetail = () => {

    setSelectedItem(null);

  };

const handleCopyBankAccount = async (accountNumber) => {
  if (!accountNumber) {
    setError("Nhân viên chưa cập nhật số tài khoản ngân hàng.");
    return;
  }

  try {
    await navigator.clipboard.writeText(accountNumber);
    setSuccess("Đã sao chép số tài khoản ngân hàng.");
    setError("");
  } catch (error) {
    setError("Không thể sao chép. Vui lòng sao chép thủ công.");
  }
};

  // ===================================================

  // RENDER

  // ===================================================



  return (

    <section className="manager-panel manager-data-page manager-payroll-page">

      {/* HEADING */}



      <div className="manager-data-heading">

        <div>

          <h2>Quản lý bảng lương</h2>



          <p>

            Tổng hợp lương cơ bản, ngày công, thưởng và phạt

            của nhân viên theo tháng.

          </p>

        </div>



        <button

          type="button"

          className="manager-action-button primary"

          onClick={handleRefresh}

          disabled={loading || Boolean(creatingId) || Boolean(payingId)}

        >

          <RefreshCw

            size={16}

            className={loading ? "spin" : ""}

          />



          {loading ? "Đang tải..." : "Làm mới"}

        </button>

      </div>



      {/* FILTER */}



      <div className="manager-filter-row">

        <label className="manager-month-filter">

          <CalendarCheck size={17} />



          <input

            type="month"

            value={month}

            onChange={(event) => {

              setMonth(event.target.value);

              setSuccess("");

              setError("");

            }}

          />

        </label>



        <div className="manager-search-filter">

          <Search size={17} />



          <input

            value={keyword}

            onChange={(event) => setKeyword(event.target.value)}

            placeholder="Tìm tên, mã nhân viên, phòng ban..."

          />

        </div>

      </div>



      {/* ERROR */}



      {error && (

        <div className="manager-error-message">

          <AlertCircle size={17} />

          {error}

        </div>

      )}



      {/* SUCCESS */}



      {success && (

        <div className="manager-success-message">

          <CheckCircle2 size={17} />

          {success}

        </div>

      )}



      {/* STATISTICS */}



      <div className="manager-stats">

        <StatCard

          icon={Users}

          title="Tổng nhân viên"

          value={summary.employeeCount}

          color="blue"

          note="Nhân viên được tổng hợp"

        />



        <StatCard

          icon={CalendarCheck}

          title="Tổng ngày công"

          value={summary.totalWorkDays}

          color="green"

          note="Chỉ dùng để thống kê"

        />



        <StatCard

          icon={Gift}

          title="Tổng tiền thưởng"

          value={summary.totalBonus}

          color="purple"

          note="Thưởng trong tháng"

          isMoney

        />



        <StatCard

          icon={Wallet}

          title="Tổng tiền phạt"

          value={summary.totalPenalty}

          color="orange"

          note="Phạt trong tháng"

          isMoney

        />

      </div>



      {/* PAYROLL TABLE */}



      <div className="manager-table-section">

        <div className="panel-heading">

          <div>

            <h2>Bảng tổng hợp lương nhân viên</h2>



            <p>

              Tháng {getSelectedMonthText(month)}

            </p>

          </div>



          <div className="manager-payroll-count">

            {filteredEmployees.length} nhân viên

          </div>

        </div>



        <div className="responsive-table">

          <table className="manager-table manager-payroll-table">

            <thead>

              <tr>

                <th>Nhân viên</th>

                <th>Phòng ban</th>

                <th>Lương cơ bản</th>

                <th>Ngày công</th>

                <th>Số lần đi muộn</th>

                <th>Phút đi muộn</th>

                <th>Số lần về sớm</th>

                <th>Tiền thưởng</th>

                <th>Tiền phạt</th>

                <th>Tổng lương thực nhận</th>

                <th>Trạng thái</th>

                <th>Chi tiết</th>

                <th>Thao tác</th>

              </tr>

            </thead>



            <tbody>

              {loading ? (

                <tr>

                  <td colSpan="13" className="empty-state">

                    Đang tải dữ liệu bảng lương...

                  </td>

                </tr>

              ) : filteredEmployees.length === 0 ? (

                <tr>

                  <td colSpan="13" className="empty-state">

                    Không có dữ liệu bảng lương tháng{" "}

                    {getSelectedMonthText(month)}.

                  </td>

                </tr>

              ) : (

                filteredEmployees.map((item, index) => {

                  const employee = item.employee || {};

                  const attendance = item.attendance || {};



                  const isPaid = item.status === "paid";

                  const isNotCreated = item.status === "not_created";



                  const employeeId = String(employee._id || "");

                  const payrollId = String(item.payroll?._id || "");



                  const isCreating = creatingId === employeeId;

                  const isPaying = payingId === payrollId;



                  return (

                    <tr

                      key={

                        employee._id ||

                        item.payroll?._id ||

                        `${employee.employeeCode}-${index}`

                      }

                    >

                      {/* EMPLOYEE */}



                      <td>

                        <div className="employee-cell">

                          <div className="avatar">

                            {(employee.name || "N")

                              .trim()

                              .charAt(0)

                              .toUpperCase()}

                          </div>



                          <div>

                            <strong>

                              {employee.name || "Chưa cập nhật"}

                            </strong>



                            <small>

                              {employee.employeeCode || "Chưa có mã"}

                            </small>

                          </div>

                        </div>

                      </td>



                      {/* DEPARTMENT */}



                      <td>{employee.department || "—"}</td>



                      {/* BASIC SALARY */}



                      <td className="manager-money-basic">

                        {money(item.basicSalary)}

                      </td>



                      {/* WORK DAYS */}



                      <td>

                        {numberFormat(

                          attendance.workDays ?? item.workDays

                        )}

                      </td>



                      {/* LATE COUNT */}



                      <td>

                        {numberFormat(attendance.lateCount)}

                      </td>



                      {/* LATE MINUTES */}



                      <td>

                        {numberFormat(attendance.lateMinutes)}

                      </td>



                      {/* EARLY LEAVE */}



                      <td>

                        {numberFormat(attendance.earlyLeaveCount)}

                      </td>



                      {/* BONUS */}



                      <td className="manager-money-positive">

                        +{money(item.bonus)}

                      </td>



                      {/* PENALTY */}



                      <td className="manager-money-negative">

                        -{money(item.penalty)}

                      </td>



                      {/* TOTAL SALARY */}



                      <td className="manager-money-total">

                        {money(item.totalSalary)}

                      </td>



                      {/* STATUS */}



                      <td>

                        {isPaid ? (

                          <span className="manager-payroll-status paid">

                            <CheckCircle2 size={14} />

                            Đã trả

                          </span>

                        ) : isNotCreated ? (

                          <span className="manager-payroll-status not-created">

                            Chưa tạo

                          </span>

                        ) : (

                          <span className="manager-payroll-status draft">

                            <Clock size={14} />

                            Chờ trả

                          </span>

                        )}

                      </td>



                      {/* DETAIL */}



                      <td>

                        <button

                          type="button"

                          className="manager-icon-button"

                          title="Xem chi tiết lương"

                          onClick={() => openDetail(item)}

                        >

                          <Eye size={17} />

                        </button>

                      </td>



                      {/* ACTION */}



                      <td>

                        {isNotCreated ? (

                          <button

                            type="button"

                            className="manager-action-button primary manager-create-payroll-button"

                            disabled={

                              Boolean(creatingId) ||

                              Boolean(payingId) ||

                              loading

                            }

                            onClick={() => handleCreatePayroll(item)}

                          >

                            <PlusCircle size={15} />



                            {isCreating

                              ? "Đang tạo..."

                              : "Tạo lương"}

                          </button>

                        ) : isPaid ? (

                          <span className="manager-payroll-status paid">

                            <CheckCircle2 size={14} />

                            Hoàn tất

                          </span>

                        ) : (

                          <button

                            type="button"

                            className="manager-action-button primary manager-payroll-pay-button"

                            disabled={

                              Boolean(creatingId) ||

                              Boolean(payingId) ||

                              loading

                            }

                            onClick={() => handleMarkPaid(item)}

                          >

                            <Banknote size={15} />



                            {isPaying

                              ? "Đang xử lý..."

                              : "Thanh toán"}

                          </button>

                        )}

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

        </div>



        {/* FOOTNOTE */}



        <div className="manager-payroll-note">

          <AlertCircle size={16} />



          <span>

            Lương cơ bản được tính đủ theo tháng.

            Ngày công chỉ dùng để theo dõi, không dùng để

            chia lương. Thực nhận = Lương cơ bản + Phụ cấp

            + Thưởng - Phạt - Khấu trừ bổ sung.

          </span>

        </div>

      </div>



      {/* PAYMENT CONFIRMATION MODAL */}
      {paymentConfirmItem && (
        <div
          className="manager-modal-backdrop manager-payment-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !payingId) {
              setPaymentConfirmItem(null);
            }
          }}
        >
          <div className="manager-modal manager-payment-confirm" role="dialog" aria-modal="true" aria-labelledby="payment-confirm-title">
            <div className="manager-payment-confirm-icon"><Banknote size={27} /></div>
            <button type="button" className="manager-icon-button manager-payment-confirm-close" aria-label="Đóng" disabled={Boolean(payingId)} onClick={() => setPaymentConfirmItem(null)}>
              <X size={18} />
            </button>
            <h3 id="payment-confirm-title">Xác nhận thanh toán lương</h3>
            <p className="manager-payment-confirm-description">
              Bạn có chắc chắn muốn xác nhận đã thanh toán lương cho
              <strong> {paymentConfirmItem.employee?.name || "nhân viên này"}</strong>?
            </p>
            <div className="manager-payment-confirm-summary">
              <div><span>Kỳ lương</span><strong>{getSelectedMonthText(month)}</strong></div>
              <div><span>Mã nhân viên</span><strong>{paymentConfirmItem.employee?.employeeCode || "—"}</strong></div>
              <div className="manager-payment-confirm-total"><span>Tổng thực nhận</span><strong>{money(paymentConfirmItem.totalSalary)}</strong></div>
            </div>
            <p className="manager-payment-confirm-note">
              Sau khi xác nhận, bảng lương sẽ chuyển sang trạng thái đã thanh toán.
            </p>
            <div className="manager-payment-confirm-actions">
              <button type="button" className="manager-payment-cancel" disabled={Boolean(payingId)} onClick={() => setPaymentConfirmItem(null)}>Hủy</button>
              <button type="button" className="manager-payment-submit" disabled={Boolean(payingId)} onClick={confirmMarkPaid}>
                {payingId ? <><RefreshCw size={16} className="spin" /> Đang xử lý...</> : <><CheckCircle2 size={17} /> Xác nhận thanh toán</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}



      {selectedItem && (

        <div

          className="manager-modal-backdrop"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              closeDetail();

            }

          }}

        >

          <div className="manager-modal manager-payroll-detail">

            {/* MODAL HEADER */}



            <div className="manager-modal-heading">

              <div>

                <h3>Chi tiết bảng lương</h3>



                <p>

                  {selectedItem.employee?.name || "Nhân viên"}

                  {" · "}

                  {selectedItem.employee?.employeeCode || ""}

                </p>

              </div>



              <button

                type="button"

                className="manager-icon-button"

                onClick={closeDetail}

              >

                <X size={18} />

              </button>

            </div>



            {/* EMPLOYEE INFO */}



            <div className="manager-payroll-detail-info">

              <div>

                <span>Phòng ban</span>

                <strong>

                  {selectedItem.employee?.department || "—"}

                </strong>

              </div>



              <div>

                <span>Tháng tính lương</span>

                <strong>

                  {getSelectedMonthText(month)}

                </strong>

              </div>

            </div>

{/* THÔNG TIN TÀI KHOẢN NGÂN HÀNG */}
<h4>Thông tin tài khoản ngân hàng</h4>

<div className="manager-payroll-bank-info">
  <div>
    <span>Ngân hàng</span>
    <strong>
      {selectedItem.employee?.bankInfo?.bankName || "Chưa cập nhật"}
    </strong>
  </div>

  <div>
    <span>Chủ tài khoản</span>
    <strong>
      {selectedItem.employee?.bankInfo?.accountHolder || "Chưa cập nhật"}
    </strong>
  </div>

  <div>
    <span>Số tài khoản</span>
    <div className="manager-payroll-bank-account">
      <strong>
        {selectedItem.employee?.bankInfo?.accountNumber || "Chưa cập nhật"}
      </strong>

      {selectedItem.employee?.bankInfo?.accountNumber && (
        <button
          type="button"
          onClick={() =>
            handleCopyBankAccount(
              selectedItem.employee.bankInfo.accountNumber
            )
          }
          title="Sao chép số tài khoản"
        >
          <Copy size={15} />
          Sao chép
        </button>
      )}
    </div>
  </div>

  <div>
    <span>Chi nhánh</span>
    <strong>
      {selectedItem.employee?.bankInfo?.branch || "Chưa cập nhật"}
    </strong>
  </div>
</div>




            {/* SALARY BREAKDOWN */}



            <h4>Chi tiết thu nhập</h4>



            <div className="manager-payroll-breakdown">

              <div>

                <span>Lương cơ bản</span>

                <strong>

                  {money(selectedItem.basicSalary)}

                </strong>

              </div>



              <div>

                <span>Phụ cấp</span>

                <strong className="manager-money-positive">

                  +{money(selectedItem.allowance)}

                </strong>

              </div>



              <div>

                <span>Tiền thưởng</span>

                <strong className="manager-money-positive">

                  +{money(selectedItem.bonus)}

                </strong>

              </div>



              <div>

                <span>Tiền phạt</span>

                <strong className="manager-money-negative">

                  -{money(selectedItem.penalty)}

                </strong>

              </div>



              <div>

                <span>Khấu trừ bổ sung</span>

                <strong className="manager-money-negative">

                  -{money(selectedItem.additionalDeduction)}

                </strong>

              </div>



              <div className="manager-payroll-final">

                <span>TỔNG LƯƠNG THỰC NHẬN</span>



                <strong>

                  {money(selectedItem.totalSalary)}

                </strong>

              </div>

            </div>



            {/* ATTENDANCE */}



            <h4>Thống kê chấm công</h4>



            <div className="manager-payroll-detail-info">

              <div>

                <span>Ngày công</span>

                <strong>

                  {numberFormat(

                    selectedItem.attendance?.workDays ??

                      selectedItem.workDays

                  )}

                </strong>

              </div>



              <div>

                <span>Số lần đi muộn</span>

                <strong>

                  {numberFormat(

                    selectedItem.attendance?.lateCount

                  )}

                </strong>

              </div>



              <div>

                <span>Tổng phút đi muộn</span>

                <strong>

                  {numberFormat(

                    selectedItem.attendance?.lateMinutes

                  )}{" "}

                  phút

                </strong>

              </div>



              <div>

                <span>Số lần về sớm</span>

                <strong>

                  {numberFormat(

                    selectedItem.attendance?.earlyLeaveCount

                  )}

                </strong>

              </div>

            </div>



            {/* NOTE */}



            {selectedItem.payroll?.note && (

              <div className="manager-payroll-note">

                <strong>Ghi chú:</strong>

                <span>{selectedItem.payroll.note}</span>

              </div>

            )}



            {/* FOOTER */}



            <div className="manager-payroll-modal-footer">

              <span>

                {selectedItem.status === "paid"

                  ? "Bảng lương đã thanh toán"

                  : selectedItem.status === "not_created"

                  ? "Bảng lương chưa được tạo"

                  : "Bảng lương đang chờ thanh toán"}

              </span>



              <button

                type="button"

                className="manager-action-button primary"

                onClick={closeDetail}

              >

                Đóng

              </button>

            </div>

          </div>

        </div>

      )}

    </section>

  );

}
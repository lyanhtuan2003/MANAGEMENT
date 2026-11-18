
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

export default function EmployeeConfirm({
  type = "delete",
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
}) {
  const isDelete = type === "delete";

  return (
    <div className="ec-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}>
      <div className="ec-modal">
        <button className="ec-close" onClick={onCancel}>
          <X size={19} />
        </button>

        <div className={`ec-icon ${isDelete ? "danger" : "warning"}`}>
          {isDelete ? (
            <Trash2 size={29} />
          ) : (
            <Pencil size={29} />
          )}
        </div>

        <h3>{title}</h3>
        <p>{message}</p>

        <div className="ec-actions">
          <button className="ec-cancel" onClick={onCancel}>
            {cancelText}
          </button>

          <button
            className={`ec-confirm ${isDelete ? "danger-btn" : ""}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeToast({ type = "success", message, onClose }) {
  const Icon =
    type === "success"
      ? CheckCircle2
      : type === "error"
      ? XCircle
      : AlertTriangle;

  return (
    <div className={`ec-toast ec-toast-${type}`}>
      <Icon size={23} />

      <div>
        <strong>
          {type === "success"
            ? "Thành công"
            : type === "error"
            ? "Có lỗi xảy ra"
            : "Thông báo"}
        </strong>
        <span>{message}</span>
      </div>

      <button onClick={onClose}>
        <X size={17} />
      </button>
    </div>
  );
}


import User from "../models/User.js";

// ======================================
// CẬP NHẬT TÀI KHOẢN NGÂN HÀNG CÁ NHÂN
// PATCH /api/profile/bank-info
// ======================================

export const updateMyBankInfo = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập lại.",
      });
    }

    const role = String(req.user?.role || "").toLowerCase();

    if (!["employee", "accountant"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản không có quyền cập nhật thông tin này.",
      });
    }

    const {
      bankName,
      accountNumber,
      accountHolder,
      branch,
    } = req.body;

    if (
      typeof bankName !== "string" ||
      !bankName.trim() ||
      typeof accountNumber !== "string" ||
      !accountNumber.trim() ||
      typeof accountHolder !== "string" ||
      !accountHolder.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin ngân hàng bắt buộc.",
      });
    }

    const user = await User.findById(userId);

    if (!user || user.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Không thể cập nhật tài khoản này.",
      });
    }

    user.bankInfo = {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
      branch: String(branch || "").trim(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin ngân hàng thành công.",
      bankInfo: user.bankInfo,
    });
  } catch (error) {
    console.error("updateMyBankInfo error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật thông tin ngân hàng.",
    });
  }
};

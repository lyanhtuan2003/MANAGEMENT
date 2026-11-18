import mongoose from "mongoose";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const validStatuses = ["planning", "active", "completed", "paused"];

const validDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

const getMemberIds = (members) => {
  if (!Array.isArray(members)) return [];

  return [...new Set(
    members
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => String(id))
  )];
};

const notifyMembers = async ({
  memberIds,
  project,
  type = "project_assigned",
}) => {
  if (!memberIds.length) return;

  const title =
    type === "project_assigned"
      ? "Bạn được thêm vào dự án mới"
      : "Dự án của bạn vừa được cập nhật";

  const message =
    type === "project_assigned"
      ? `Quản lý đã thêm bạn vào dự án "${project.name}". Hãy kiểm tra thông tin và nhiệm vụ được giao.`
      : `Dự án "${project.name}" vừa được cập nhật. Hãy kiểm tra tiến độ mới.`;

  await Notification.insertMany(
    memberIds.map((recipient) => ({
      recipient,
      type,
      title,
      message,
      project: project._id,
    }))
  );
};

// ============================================
// QUẢN LÝ: LẤY DANH SÁCH DỰ ÁN
// GET /api/projects/manager
// ============================================

export const getManagerProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("members", "name employeeCode email department position")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get manager projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách dự án.",
    });
  }
};

// ============================================
// QUẢN LÝ: TẠO DỰ ÁN
// POST /api/projects/manager
// ============================================

export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      leader,
      members,
      startDate,
      endDate,
      progress,
      status,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên dự án.",
      });
    }

    const memberIds = getMemberIds(members);

    if (Array.isArray(members) && memberIds.length !== members.length) {
      return res.status(400).json({
        success: false,
        message: "Danh sách nhân viên không hợp lệ.",
      });
    }

    const validMembers = await User.find({
      _id: { $in: memberIds },
      role: "employee",
      isActive: true,
      status: { $ne: "resigned" },
    }).select("_id");

    if (validMembers.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: "Có nhân viên không tồn tại hoặc tài khoản đã ngừng hoạt động.",
      });
    }

    const start = validDate(startDate);
    const end = validDate(endDate);

    if (start === undefined || end === undefined) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu hoặc kết thúc không hợp lệ.",
      });
    }

    if (start && end && end < start) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    }

    const projectStatus = status || "planning";

    if (!validStatuses.includes(projectStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái dự án không hợp lệ.",
      });
    }

    const projectProgress = Number(progress ?? 0);

    if (
      !Number.isFinite(projectProgress) ||
      projectProgress < 0 ||
      projectProgress > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Tiến độ phải nằm trong khoảng 0 đến 100.",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      leader,
      members: memberIds,
      startDate: start,
      endDate: end,
      progress: projectProgress,
      status: projectStatus,
      createdBy: req.user._id,
    });

    await notifyMembers({
      memberIds,
      project,
      type: "project_assigned",
    });

    const result = await Project.findById(project._id)
      .populate("members", "name employeeCode email department position")
      .populate("createdBy", "name");

    return res.status(201).json({
      success: true,
      message: "Tạo dự án và gửi thông báo cho nhân viên thành công.",
      project: result,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo dự án.",
    });
  }
};

// ============================================
// QUẢN LÝ: CẬP NHẬT DỰ ÁN
// PUT /api/projects/manager/:id
// ============================================

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID dự án không hợp lệ.",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    const {
      name,
      description,
      leader,
      members,
      startDate,
      endDate,
      progress,
      status,
    } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Tên dự án không được để trống.",
        });
      }

      project.name = name.trim();
    }

    if (description !== undefined) project.description = description;
    if (leader !== undefined) project.leader = leader;

    if (members !== undefined) {
      const memberIds = getMemberIds(members);

      if (!Array.isArray(members) || memberIds.length !== members.length) {
        return res.status(400).json({
          success: false,
          message: "Danh sách nhân viên không hợp lệ.",
        });
      }

      const validMembers = await User.find({
        _id: { $in: memberIds },
        role: "employee",
        isActive: true,
        status: { $ne: "resigned" },
      }).select("_id");

      if (validMembers.length !== memberIds.length) {
        return res.status(400).json({
          success: false,
          message: "Có nhân viên không tồn tại hoặc tài khoản đã ngừng hoạt động.",
        });
      }

      const oldMemberIds = project.members.map((member) => String(member));

      const newMembers = memberIds.filter(
        (memberId) => !oldMemberIds.includes(memberId)
      );

      project.members = memberIds;

      if (newMembers.length) {
        await notifyMembers({
          memberIds: newMembers,
          project,
          type: "project_assigned",
        });
      }
    }

    if (startDate !== undefined) {
      const start = validDate(startDate);

      if (start === undefined) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu không hợp lệ.",
        });
      }

      project.startDate = start;
    }

    if (endDate !== undefined) {
      const end = validDate(endDate);

      if (end === undefined) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc không hợp lệ.",
        });
      }

      project.endDate = end;
    }

    if (
      project.startDate &&
      project.endDate &&
      project.endDate < project.startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    }

    if (progress !== undefined) {
      const value = Number(progress);

      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          message: "Tiến độ phải nằm trong khoảng 0 đến 100.",
        });
      }

      project.progress = value;
    }

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái dự án không hợp lệ.",
        });
      }

      project.status = status;
    }

    await project.save();

    const result = await Project.findById(project._id)
      .populate("members", "name employeeCode email department position")
      .populate("createdBy", "name");

    return res.status(200).json({
      success: true,
      message: "Cập nhật dự án thành công.",
      project: result,
    });
  } catch (error) {
    console.error("Update project error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật dự án.",
    });
  }
};

// ============================================
// QUẢN LÝ: XÓA DỰ ÁN
// DELETE /api/projects/manager/:id
// ============================================

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID dự án không hợp lệ.",
      });
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    await Notification.deleteMany({ project: project._id });

    return res.status(200).json({
      success: true,
      message: "Đã xóa dự án.",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa dự án.",
    });
  }
};

// ============================================
// NHÂN VIÊN: XEM DỰ ÁN CỦA MÌNH
// GET /api/projects/me
// ============================================

export const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      members: req.user._id,
    })
      .populate("members", "name employeeCode")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get my projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải dự án của bạn.",
    });
  }
};
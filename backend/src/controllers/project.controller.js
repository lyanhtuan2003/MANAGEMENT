import mongoose from "mongoose";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";


// ======================================
// UPLOAD FILE LÊN CLOUDINARY
// ======================================

const uploadProjectFileToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const isImage = file.mimetype.startsWith("image/");

    const publicId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "internal-management/project-tasks",
        resource_type: isImage ? "image" : "raw",
        public_id: isImage
          ? publicId
          : `${publicId}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve({
          name: file.originalname,
          originalName: file.originalname,
          filename: result.public_id,
          path: result.secure_url,
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          mimeType: file.mimetype,
          size: file.size,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

// Upload nhiều file
const uploadProjectAttachments = async (files = []) => {
  if (!files.length) return [];

  return Promise.all(
    files.map((file) => uploadProjectFileToCloudinary(file))
  );
};

// ======================================
// XÓA FILE TRÊN CLOUDINARY
// ======================================


const deleteProjectFileFromCloudinary = async (attachment) => {
  if (!attachment?.publicId) {
    return {
      success: true,
      skipped: true,
    };
  }

  const resourceType =
    attachment.resourceType === "image" ? "image" : "raw";

  const result = await cloudinary.uploader.destroy(
    attachment.publicId,
    {
      resource_type: resourceType,
      type: "upload",
    }
  );

  if (
    result.result !== "ok" &&
    result.result !== "not found"
  ) {
    throw new Error(
      `Cloudinary không xóa được file: ${attachment.publicId}`
    );
  }

  return {
    success: true,
    publicId: attachment.publicId,
  };
};

// Xóa nhiều file trên Cloudinary
const deleteProjectAttachments = async (attachments = []) => {
  const results = await Promise.allSettled(
    attachments.map((attachment) =>
      deleteProjectFileFromCloudinary(attachment)
    )
  );

  const failed = results.filter(
    (result) => result.status === "rejected"
  );

  if (failed.length > 0) {
    failed.forEach((item) => {
      console.error("Lỗi xóa file Cloudinary:", item.reason);
    });
  }

  return {
    success: failed.length === 0,
    failedCount: failed.length,
  };
};


// ======================================
// HÀM HỖ TRỢ
// ======================================

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserId = (req) => req.user?._id || req.user?.id;

const getActiveProjectMember = async (employeeId) => {
  if (!isValidId(employeeId)) return null;

  return User.findOne({
    _id: employeeId,
    role: { $in: ["employee", "accountant"] },
    isActive: { $ne: false },
    status: { $nin: ["resigned", "locked", "inactive"] },
  }).select("name employeeCode department position role status isActive");
};

const populateProject = (query) =>
  query
    .populate(
      "members",
      "name employeeCode department position role status isActive"
    )
    .populate("createdBy", "name employeeCode");

const calculateProjectProgress = (tasks = []) => {
  if (!tasks.length) return 0;

  const total = tasks.reduce(
    (sum, task) => sum + (Number(task.progress) || 0),
    0
  );

  return Math.round(total / tasks.length);
};

const syncProjectProgress = (project) => {
  project.progress = calculateProjectProgress(project.tasks);

  if (
    project.tasks.length > 0 &&
    project.tasks.every((task) => task.status === "done")
  ) {
    project.progress = 100;
  }

  return project.progress;
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getAttachmentData = (files = []) => {
  return files.map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    path: `/uploads/project-tasks/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
  }));
};

const getTaskById = (project, taskId) => {
  if (!isValidId(taskId)) return null;

  return project.tasks.id(taskId);
};

// ======================================
// QUẢN LÝ: DANH SÁCH DỰ ÁN
// GET /api/projects/manager
// ======================================

export const getManagerProjects = async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("getManagerProjects:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách dự án.",
    });
  }
};

// ======================================
// QUẢN LÝ: TẠO DỰ ÁN
// POST /api/projects/manager
// ======================================

export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      leader,
      members,
      startDate,
      endDate,
      status,
      progress,
    } = req.body;

    if (!String(name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên dự án.",
      });
    }

    const memberIds = Array.isArray(members)
      ? members
      : typeof members === "string"
        ? JSON.parse(members || "[]")
        : [];

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách thành viên không hợp lệ.",
      });
    }

    const uniqueMemberIds = [
      ...new Set(memberIds.map((id) => String(id))),
    ];

    for (const id of uniqueMemberIds) {
      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Mã nhân viên không hợp lệ.",
        });
      }
    }

    const validMembers = await User.find({
      _id: { $in: uniqueMemberIds },
      role: { $in: ["employee", "accountant"] },
      isActive: { $ne: false },
      status: { $nin: ["resigned", "locked", "inactive"] },
    }).select("_id");

    if (validMembers.length !== uniqueMemberIds.length) {
      return res.status(400).json({
        success: false,
        message: "Có nhân viên không tồn tại hoặc đã ngừng hoạt động.",
      });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (startDate && !start) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không hợp lệ.",
      });
    }

    if (endDate && !end) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không hợp lệ.",
      });
    }

    if (start && end && end < start) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không được trước ngày bắt đầu.",
      });
    }

    const allowedStatuses = [
      "planning",
      "active",
      "completed",
      "paused",
    ];

    const projectStatus = allowedStatuses.includes(status)
      ? status
      : "planning";

    const project = await Project.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      leader: String(leader || "").trim(),
      members: validMembers.map((member) => member._id),
      startDate: start,
      endDate: end,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      status: projectStatus,
      createdBy: getUserId(req),
      tasks: [],
    });

      // Gửi thông báo cho các thành viên được giao dự án
      try {
        await Notification.insertMany(
          validMembers.map((member) => ({
            recipient: member._id,
            type: "project_assigned",
            title: "Bạn được phân công vào dự án mới",
            message: `Bạn đã được quản lý phân công tham gia dự án "${project.name}".`,
            project: project._id,
            isRead: false,
          }))
        );
      } catch (notificationError) {
        console.error(
          "Lỗi gửi thông báo giao dự án:",
          notificationError
        );
      }

    const populated = await populateProject(
      Project.findById(project._id)
    );

    return res.status(201).json({
      success: true,
      message: "Tạo dự án thành công.",
      project: populated,
    });
  } catch (error) {
    console.error("createProject:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo dự án.",
    });
  }
};

// ======================================
// QUẢN LÝ: CẬP NHẬT DỰ ÁN
// PUT /api/projects/manager/:id
// ======================================

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án không hợp lệ.",
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
      status,
      progress,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Tên dự án không được để trống.",
        });
      }

      project.name = String(name).trim();
    }

    if (description !== undefined) {
      project.description = String(description).trim();
    }

    if (leader !== undefined) {
      project.leader = String(leader).trim();
    }

    if (members !== undefined) {
      const memberIds = Array.isArray(members)
        ? members
        : typeof members === "string"
          ? JSON.parse(members || "[]")
          : [];

      if (!Array.isArray(memberIds)) {
        return res.status(400).json({
          success: false,
          message: "Danh sách thành viên không hợp lệ.",
        });
      }

      const uniqueMemberIds = [
        ...new Set(memberIds.map((memberId) => String(memberId))),
      ];

      for (const memberId of uniqueMemberIds) {
        if (!isValidId(memberId)) {
          return res.status(400).json({
            success: false,
            message: "Mã nhân viên không hợp lệ.",
          });
        }
      }

      const validMembers = await User.find({
        _id: { $in: uniqueMemberIds },
        role: { $in: ["employee", "accountant"] },
        isActive: { $ne: false },
        status: { $nin: ["resigned", "locked", "inactive"] },
      }).select("_id");

      if (validMembers.length !== uniqueMemberIds.length) {
        return res.status(400).json({
          success: false,
          message: "Có nhân viên không tồn tại hoặc đã ngừng hoạt động.",
        });
      }

      project.members = validMembers.map((member) => member._id);
    }

    if (startDate !== undefined) {
      project.startDate = parseDate(startDate);

      if (startDate && !project.startDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu không hợp lệ.",
        });
      }
    }

    if (endDate !== undefined) {
      project.endDate = parseDate(endDate);

      if (endDate && !project.endDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc không hợp lệ.",
        });
      }
    }

    if (
      project.startDate &&
      project.endDate &&
      project.endDate < project.startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày kết thúc không được trước ngày bắt đầu.",
      });
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "planning",
        "active",
        "completed",
        "paused",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái dự án không hợp lệ.",
        });
      }

      project.status = status;
    }

    // Nếu dự án đã có công việc thì tiến độ được tính từ các công việc.
    if (project.tasks.length > 0) {
      syncProjectProgress(project);
    } else if (progress !== undefined) {
      project.progress = Math.min(
        100,
        Math.max(0, Number(progress) || 0)
      );
    }

    await project.save();

    const populated = await populateProject(
      Project.findById(project._id)
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật dự án thành công.",
      project: populated,
    });
  } catch (error) {
    console.error("updateProject:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật dự án.",
    });
  }
};

// ======================================
// QUẢN LÝ: XÓA DỰ ÁN
// DELETE /api/projects/manager/:id
// ======================================


export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án không hợp lệ.",
      });
    }

    // Tìm dự án trước khi xóa
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án cần xóa.",
      });
    }

    // Thu thập tất cả file đính kèm của mọi nhiệm vụ
    const attachmentsToDelete = (project.tasks || []).flatMap(
      (task) =>
        (task.attachments || []).map((attachment) => ({
          publicId: attachment.publicId,
          resourceType: attachment.resourceType,
        }))
    );

    // Xóa dự án khỏi MongoDB
    await Project.findByIdAndDelete(id);

    // Xóa toàn bộ file trên Cloudinary
    const cloudinaryResult = await deleteProjectAttachments(
      attachmentsToDelete
    );

    return res.status(200).json({
      success: true,
      message: cloudinaryResult.success
        ? "Đã xóa dự án và toàn bộ file đính kèm thành công."
        : "Đã xóa dự án nhưng một số file trên Cloudinary chưa được xóa.",
      cloudinaryCleanup: cloudinaryResult,
    });
  } catch (error) {
    console.error("deleteProject:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa dự án.",
    });
  }
};

// ======================================
// NHÂN VIÊN / KẾ TOÁN: DỰ ÁN CỦA TÔI
// GET /api/projects/me
// ======================================

export const getMyProjects = async (req, res) => {
  try {
    const userId = getUserId(req);

    const projects = await populateProject(
      Project.find({
        members: userId,
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("getMyProjects:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải dự án của bạn.",
    });
  }
};

// ======================================
// QUẢN LÝ: CHI TIẾT DỰ ÁN
// GET /api/projects/manager/:id
// ======================================

export const getManagerProjectDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án không hợp lệ.",
      });
    }

    const project = await populateProject(
      Project.findById(id)
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("getManagerProjectDetail:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết dự án.",
    });
  }
};

// ======================================
// NHÂN VIÊN / KẾ TOÁN: CHI TIẾT DỰ ÁN
// GET /api/projects/me/:id
// ======================================


export const getMyProjectDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án không hợp lệ.",
      });
    }

    const project = await populateProject(
      Project.findOne({
        _id: id,
        members: userId,
      })
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại hoặc bạn không được phân công.",
      });
    }

    // Chỉ hiển thị nhiệm vụ được giao cho nhân viên đang đăng nhập
    project.tasks = (project.tasks || []).filter((task) => {
      const assigneeId = String(
        task.assignee?._id || task.assignee || ""
      );

      return assigneeId === String(userId);
    });

    return res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("getMyProjectDetail:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải chi tiết dự án.",
    });
  }
};


// ======================================
// QUẢN LÝ: PHÂN CÔNG CÔNG VIỆC
// POST /api/projects/manager/:id/tasks
// ======================================



export const assignProjectTask = async (req, res) => {
  let uploadedAttachments = [];

  try {
    console.log("========== ASSIGN PROJECT TASK ==========");
    console.log("1. Request body:", req.body);
    console.log("2. Số file nhận được:", req.files?.length || 0);

    const { id } = req.params;

    const {
      title,
      description,
      assignee,
      startDate,
      dueDate,
    } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án không hợp lệ.",
      });
    }

    if (!String(title || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên công việc.",
      });
    }

    console.log("3. Đang tìm dự án...");

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    if (!isValidId(assignee)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn nhân viên được giao việc.",
      });
    }

    const isMember = project.members.some(
      (memberId) => String(memberId) === String(assignee)
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được giao việc cho thành viên đang tham gia dự án.",
      });
    }

    console.log("4. Đang kiểm tra nhân viên...");

    const employee = await getActiveProjectMember(assignee);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
      });
    }

    const start = parseDate(startDate);
    const due = parseDate(dueDate);

    if (startDate && !start) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu không hợp lệ.",
      });
    }

    if (dueDate && !due) {
      return res.status(400).json({
        success: false,
        message: "Hạn hoàn thành không hợp lệ.",
      });
    }

    if (start && due && due < start) {
      return res.status(400).json({
        success: false,
        message: "Hạn hoàn thành không được trước ngày bắt đầu.",
      });
    }

    console.log("5. Đang upload file lên Cloudinary...");

    uploadedAttachments = await uploadProjectAttachments(
      req.files || []
    );

    console.log(
      "6. Upload thành công:",
      uploadedAttachments.length,
      "file"
    );

    const task = {
      title: String(title).trim(),
      description: String(description || "").trim(),
      assignee: employee._id,
      assignedBy: getUserId(req),
      startDate: start,
      dueDate: due,
      progress: 0,
      status: "todo",
      attachments: uploadedAttachments,
      employeeNote: "",
    };

    project.tasks.push(task);

    syncProjectProgress(project);

    console.log("7. Đang lưu dự án vào MongoDB...");

    await project.save();

    console.log("8. Lưu MongoDB thành công.");

    const newTask = project.tasks[project.tasks.length - 1];

    try {
      await Notification.create({
        recipient: employee._id,
        type: "project_assigned",
        title: "Bạn được giao nhiệm vụ mới",
        message: `Quản lý đã giao cho bạn nhiệm vụ "${newTask.title}" trong dự án "${project.name}".`,
        project: project._id,
        taskId: newTask._id,
        isRead: false,
      });
    } catch (notificationError) {
      console.error(
        "Create project assignment notification error:",
        notificationError
      );
    }

    console.log("9. Đang lấy dữ liệu dự án...");

    const populated = await populateProject(
      Project.findById(project._id)
    );

    console.log("10. Hoàn tất giao nhiệm vụ.");

    return res.status(201).json({
      success: true,
      message: "Phân công công việc thành công.",
      project: populated,
      task: newTask,
    });
  } catch (error) {
    console.error("========== ASSIGN PROJECT TASK ERROR ==========");
    console.error("Tên lỗi:", error.name);
    console.error("Thông báo:", error.message);
    console.error("Chi tiết:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Không thể phân công công việc.",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.message,
      }),
    });
  }
};


// ======================================
// QUẢN LÝ: CẬP NHẬT CÔNG VIỆC
// PUT /api/projects/manager/:id/tasks/:taskId
// ======================================

export const updateProjectTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;

    if (!isValidId(id) || !isValidId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án hoặc công việc không hợp lệ.",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    const task = getTaskById(project, taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc.",
      });
    }

    const {
      title,
      description,
      assignee,
      startDate,
      dueDate,
    } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Tên công việc không được để trống.",
        });
      }

      task.title = String(title).trim();
    }

    if (description !== undefined) {
      task.description = String(description).trim();
    }

    if (assignee !== undefined) {
      const isMember = project.members.some(
        (memberId) => String(memberId) === String(assignee)
      );

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Nhân viên phải là thành viên của dự án.",
        });
      }

      const employee = await getActiveProjectMember(assignee);

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Nhân viên không tồn tại hoặc đã ngừng hoạt động.",
        });
      }

      task.assignee = employee._id;
    }

    if (startDate !== undefined) {
      task.startDate = parseDate(startDate);

      if (startDate && !task.startDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày bắt đầu không hợp lệ.",
        });
      }
    }

    if (dueDate !== undefined) {
      task.dueDate = parseDate(dueDate);

      if (dueDate && !task.dueDate) {
        return res.status(400).json({
          success: false,
          message: "Hạn hoàn thành không hợp lệ.",
        });
      }
    }

    if (
      task.startDate &&
      task.dueDate &&
      task.dueDate < task.startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Hạn hoàn thành không được trước ngày bắt đầu.",
      });
    }

    if (req.files?.length) {
  const newAttachments = await uploadProjectAttachments(req.files);

  task.attachments.push(...newAttachments);
}

    syncProjectProgress(project);
    await project.save();

    const populated = await populateProject(
      Project.findById(project._id)
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật công việc thành công.",
      project: populated,
    });
  } catch (error) {
    console.error("updateProjectTask:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật công việc.",
    });
  }
};

// ======================================
// NHÂN VIÊN / KẾ TOÁN: CẬP NHẬT TIẾN ĐỘ
// PATCH /api/projects/me/:id/tasks/:taskId
// ======================================


export const updateMyTaskProgress = async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn cần đăng nhập.",
      });
    }

    if (!isValidId(id) || !isValidId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án hoặc công việc không hợp lệ.",
      });
    }

    const project = await Project.findOne({
      _id: id,
      members: userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại hoặc bạn không được phân công.",
      });
    }

    const task = getTaskById(project, taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc.",
      });
    }

    // Kiểm tra người được giao nhiệm vụ
    const assigneeId = String(
      task.assignee?._id || task.assignee || ""
    );

    if (assigneeId !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật công việc này.",
      });
    }

    // Chỉ chấp nhận hai trường được phép cập nhật
    const allowedFields = ["progress", "employeeNote"];
    const invalidFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bạn chỉ được cập nhật tiến độ và ghi chú.",
      });
    }

    const progress = Number(req.body.progress);

    if (
      req.body.progress === undefined ||
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Tiến độ phải nằm trong khoảng 0 đến 100.",
      });
    }

    task.progress = progress;

    if (req.body.employeeNote !== undefined) {
      task.employeeNote = String(req.body.employeeNote).trim();
    }

    if (progress === 100) {
      task.status = "done";
    } else if (progress > 0) {
      task.status = "doing";
    } else {
      task.status = "todo";
    }

    // Đồng bộ tiến độ tổng thể dự án
    syncProjectProgress(project);

    await project.save();

    const populated = await populateProject(
      Project.findById(project._id)
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật tiến độ công việc thành công.",
      project: populated,
    });
  } catch (error) {
    console.error("updateMyTaskProgress:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật tiến độ công việc.",
    });
  }
};


// ======================================
// QUẢN LÝ: XÓA CÔNG VIỆC
// DELETE /api/projects/manager/:id/tasks/:taskId
// ======================================

export const deleteProjectTask = async (req, res) => {
  try {
    const { id, taskId } = req.params;

    if (!isValidId(id) || !isValidId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án hoặc công việc không hợp lệ.",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    const task = getTaskById(project, taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc.",
      });
    }
    // Lưu danh sách file cần xóa
    const attachmentsToDelete = (task.attachments || []).map(
      (attachment) => ({
        publicId: attachment.publicId,
        resourceType: attachment.resourceType,
      })
    );

    // Xóa nhiệm vụ
    task.deleteOne();

    syncProjectProgress(project);

    // Lưu MongoDB trước
    await project.save();

    // Sau đó xóa file trên Cloudinary
    await deleteProjectAttachments(attachmentsToDelete);

    return res.status(200).json({
      success: true,
      message: "Đã xóa công việc.",
      project,
    });
  } catch (error) {
    console.error("deleteProjectTask:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa công việc.",
    });
  }
};

export const deleteProjectTaskAttachment = async (req, res) => {
  try {
    const { id, taskId, attachmentId } = req.params;

    if (
      !isValidId(id) ||
      !isValidId(taskId) ||
      !isValidId(attachmentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã dự án, nhiệm vụ hoặc tệp không hợp lệ.",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dự án.",
      });
    }

    const task = getTaskById(project, taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhiệm vụ.",
      });
    }

    const attachment = task.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tệp đính kèm.",
      });
    }

    const fileToDelete = {
      publicId: attachment.publicId,
      resourceType: attachment.resourceType,
    };

    // Xóa tệp khỏi danh sách trong MongoDB
    attachment.deleteOne();

    await project.save();

    // Xóa tệp trên Cloudinary sau khi MongoDB lưu thành công
    await deleteProjectAttachments([fileToDelete]);

    return res.status(200).json({
      success: true,
      message: "Đã xóa tệp đính kèm thành công.",
      project,
    });
  } catch (error) {
    console.error("deleteProjectTaskAttachment:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa tệp đính kèm.",
    });
  }
};

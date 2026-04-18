import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { uploadsDir } from "../config/paths.js";
import { store } from "../data/store.js";
import { authenticate } from "../middleware/auth.js";
import { emitGroupUpdate } from "../socket/index.js";

export const groupRouter = express.Router();

groupRouter.use(authenticate);

fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, uploadsDir);
    },
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 60);
      const safeBase = base || "resource";
      callback(null, `${Date.now()}-${safeBase}${extension}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function uploadSingleResource(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      return next();
    }
    return res.status(400).json({ error: error.message || "File upload failed." });
  });
}

function notify(req, groupId, event, payload = {}) {
  const io = req.app.locals.io;
  if (io) {
    emitGroupUpdate(io, groupId, event, payload);
  }
}

function createCallUrl(groupId) {
  const roomId = `studyconnect-${groupId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}-${Date.now().toString().slice(-5)}`;
  return `https://meet.jit.si/${roomId}#config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;
}

async function requireMember(req, res, next) {
  const { groupId } = req.params;
  const member = await store.getMembership(groupId, req.user._id);
  if (!member) {
    return res.status(403).json({ error: "You are not a member of this group." });
  }
  req.membership = member;
  return next();
}

async function requireAdmin(req, res, next) {
  const member = await store.getMembership(req.params.groupId, req.user._id);
  if (!member || member.role !== "admin") {
    return res.status(403).json({ error: "Admin permission required." });
  }
  req.membership = member;
  return next();
}

groupRouter.get("/", async (req, res) => {
  const groups = await store.listGroupsForUser(req.user._id);
  return res.json({ groups });
});

groupRouter.post("/", async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required." });
  }

  const group = await store.createGroup({
    name,
    description: description || "",
    createdBy: req.user._id
  });
  return res.status(201).json({ group });
});

groupRouter.post("/join", async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) {
    return res.status(400).json({ error: "Join code is required." });
  }

  const result = await store.joinGroupByCode({ joinCode, userId: req.user._id });
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  notify(req, result.group._id, "member-joined", { userId: req.user._id });
  return res.json({ group: result.group });
});

groupRouter.post("/:groupId/leave", requireMember, async (req, res) => {
  const result = await store.leaveGroup({
    groupId: req.params.groupId,
    userId: req.user._id
  });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  notify(req, req.params.groupId, "member-left", { userId: req.user._id });
  return res.json({ ok: true });
});

groupRouter.delete("/:groupId", requireAdmin, async (req, res) => {
  await store.deleteGroup({ groupId: req.params.groupId });
  notify(req, req.params.groupId, "group-deleted", {});
  return res.json({ ok: true });
});

groupRouter.get("/:groupId", requireMember, async (req, res) => {
  const data = await store.getGroupDetails({ groupId: req.params.groupId });
  if (!data) {
    return res.status(404).json({ error: "Group not found." });
  }
  return res.json({
    ...data,
    currentUserRole: req.membership.role
  });
});

groupRouter.post("/:groupId/topics", requireMember, async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Topic title is required." });
  }

  const topic = await store.createTopic({
    groupId: req.params.groupId,
    title,
    createdBy: req.user._id
  });
  notify(req, req.params.groupId, "topic-created", { topicId: topic._id });
  return res.status(201).json({ topic });
});

groupRouter.post("/:groupId/messages", requireMember, async (req, res) => {
  const { topicId, category, content, parentMessageId, verifyDoubtId } = req.body;
  if (!topicId || !category || !content) {
    return res.status(400).json({ error: "topicId, category, and content are required." });
  }

  const message = await store.createMessage({
    groupId: req.params.groupId,
    topicId,
    authorId: req.user._id,
    category,
    content,
    parentMessageId: parentMessageId || null,
    verifyDoubtId: verifyDoubtId || null
  });
  if (message.error) {
    return res.status(400).json({ error: message.error });
  }

  notify(req, req.params.groupId, "message-created", { messageId: message._id });
  return res.status(201).json({ message });
});

groupRouter.patch("/:groupId/messages/:messageId", requireMember, async (req, res) => {
  const message = store.getMessage(req.params.messageId);
  if (!message || message.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Message not found." });
  }
  const canEdit = message.authorId === req.user._id;
  if (!canEdit) {
    return res.status(403).json({ error: "Only the message author can edit." });
  }

  const updated = await store.updateMessage({
    groupId: req.params.groupId,
    messageId: req.params.messageId,
    content: req.body.content,
    category: req.body.category
  });
  if (updated.error) {
    return res.status(400).json({ error: updated.error });
  }

  notify(req, req.params.groupId, "message-edited", { messageId: req.params.messageId });
  return res.json({ message: updated });
});

groupRouter.delete("/:groupId/messages/:messageId", requireMember, async (req, res) => {
  const message = store.getMessage(req.params.messageId);
  if (!message || message.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Message not found." });
  }
  const canDelete = req.membership.role === "admin" || message.authorId === req.user._id;
  if (!canDelete) {
    return res.status(403).json({ error: "Only message author or admin can delete." });
  }

  const deleted = await store.deleteMessage({
    groupId: req.params.groupId,
    messageId: req.params.messageId
  });
  if (deleted.error) {
    return res.status(400).json({ error: deleted.error });
  }

  notify(req, req.params.groupId, "message-deleted", { messageId: req.params.messageId });
  return res.json({ ok: true });
});

groupRouter.patch("/:groupId/messages/:messageId/pin", requireMember, async (req, res) => {
  const message = store.getMessage(req.params.messageId);
  if (!message || message.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Message not found." });
  }

  const canPin = req.membership.role === "admin" || message.authorId === req.user._id;
  if (!canPin) {
    return res
      .status(403)
      .json({ error: "Only message author or admin can pin or unpin." });
  }

  const { pinned } = req.body;
  const updated = await store.setPinned({
    groupId: req.params.groupId,
    messageId: req.params.messageId,
    pinned
  });
  if (updated.error) {
    return res.status(404).json({ error: updated.error });
  }

  notify(req, req.params.groupId, "message-pinned", { messageId: updated._id, pinned });
  return res.json({ message: updated });
});

groupRouter.patch("/:groupId/doubts/:doubtId/verify", requireMember, async (req, res) => {
  const { solutionId } = req.body;
  if (!solutionId) {
    return res.status(400).json({ error: "solutionId is required." });
  }

  const doubt = store.getMessage(req.params.doubtId);
  if (!doubt || doubt.groupId !== req.params.groupId || doubt.category !== "doubt") {
    return res.status(404).json({ error: "Doubt not found." });
  }
  if (doubt.authorId !== req.user._id) {
    return res
      .status(403)
      .json({ error: "Only the user who asked the doubt can verify a solution." });
  }

  const verified = await store.resolveDoubt({
    groupId: req.params.groupId,
    doubtId: req.params.doubtId,
    solutionId,
    verifiedBy: req.user._id
  });
  if (verified.error) {
    return res.status(400).json({ error: verified.error });
  }

  notify(req, req.params.groupId, "doubt-verified", {
    doubtId: req.params.doubtId,
    solutionId
  });
  return res.json({ doubt: verified });
});

groupRouter.post("/:groupId/resources", requireMember, async (req, res) => {
  const { topicId, title, url, type, linkedDoubtId } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: "title and url are required." });
  }

  const resource = await store.addResource({
    groupId: req.params.groupId,
    topicId: topicId || null,
    title,
    url,
    type: type || "link",
    linkedDoubtId: linkedDoubtId || null,
    uploadedBy: req.user._id
  });
  if (resource.error) {
    return res.status(400).json({ error: resource.error });
  }

  notify(req, req.params.groupId, "resource-added", { resourceId: resource._id });
  return res.status(201).json({ resource });
});

groupRouter.post(
  "/:groupId/resources/upload",
  requireMember,
  uploadSingleResource,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Please select a file to upload." });
    }

    const { topicId, title, type, linkedDoubtId } = req.body;
    const resource = await store.addResource({
      groupId: req.params.groupId,
      topicId: topicId || null,
      title: title || req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      type: type || "file",
      resourceKind: "file",
      fileName: req.file.originalname,
      mimeType: req.file.mimetype || "",
      fileSize: req.file.size || 0,
      linkedDoubtId: linkedDoubtId || null,
      uploadedBy: req.user._id
    });
    if (resource.error) {
      return res.status(400).json({ error: resource.error });
    }

    notify(req, req.params.groupId, "resource-added", { resourceId: resource._id });
    return res.status(201).json({ resource });
  }
);

groupRouter.patch("/:groupId/resources/:resourceId", requireMember, async (req, res) => {
  const resource = store.getResource(req.params.resourceId);
  if (!resource || resource.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Resource not found." });
  }
  const canEdit = req.membership.role === "admin" || resource.uploadedBy === req.user._id;
  if (!canEdit) {
    return res.status(403).json({ error: "Only uploader or admin can edit resource." });
  }

  const updated = await store.updateResource({
    groupId: req.params.groupId,
    resourceId: req.params.resourceId,
    payload: req.body
  });
  if (updated.error) {
    return res.status(400).json({ error: updated.error });
  }

  notify(req, req.params.groupId, "resource-edited", { resourceId: req.params.resourceId });
  return res.json({ resource: updated });
});

groupRouter.delete("/:groupId/resources/:resourceId", requireMember, async (req, res) => {
  const resource = store.getResource(req.params.resourceId);
  if (!resource || resource.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Resource not found." });
  }
  const canDelete = req.membership.role === "admin" || resource.uploadedBy === req.user._id;
  if (!canDelete) {
    return res.status(403).json({ error: "Only uploader or admin can delete resource." });
  }

  const deleted = await store.deleteResource({
    groupId: req.params.groupId,
    resourceId: req.params.resourceId
  });
  if (deleted.error) {
    return res.status(400).json({ error: deleted.error });
  }

  notify(req, req.params.groupId, "resource-deleted", { resourceId: req.params.resourceId });
  return res.json({ ok: true });
});

groupRouter.post("/:groupId/events", requireAdmin, async (req, res) => {
  const { title, description, dueAt } = req.body;
  if (!title || !dueAt) {
    return res.status(400).json({ error: "title and dueAt are required." });
  }

  const event = await store.addEvent({
    groupId: req.params.groupId,
    title,
    description,
    dueAt,
    createdBy: req.user._id
  });
  notify(req, req.params.groupId, "event-added", { eventId: event._id });
  return res.status(201).json({ event });
});

groupRouter.patch("/:groupId/events/:eventId", requireAdmin, async (req, res) => {
  const updated = await store.updateEvent({
    groupId: req.params.groupId,
    eventId: req.params.eventId,
    payload: req.body
  });
  if (updated.error) {
    return res.status(400).json({ error: updated.error });
  }

  notify(req, req.params.groupId, "event-edited", { eventId: req.params.eventId });
  return res.json({ event: updated });
});

groupRouter.delete("/:groupId/events/:eventId", requireAdmin, async (req, res) => {
  const deleted = await store.deleteEvent({
    groupId: req.params.groupId,
    eventId: req.params.eventId
  });
  if (deleted.error) {
    return res.status(400).json({ error: deleted.error });
  }

  notify(req, req.params.groupId, "event-deleted", { eventId: req.params.eventId });
  return res.json({ ok: true });
});

groupRouter.post("/:groupId/call/start", requireMember, async (req, res) => {
  const existing = store.getGroup(req.params.groupId)?.activeCall;
  if (existing) {
    return res.json({ call: existing, alreadyActive: true });
  }

  const { topicId } = req.body;
  const call = await store.startCall({
    groupId: req.params.groupId,
    startedBy: req.user._id,
    topicId: topicId || null,
    url: createCallUrl(req.params.groupId)
  });
  if (call.error) {
    return res.status(400).json({ error: call.error });
  }

  notify(req, req.params.groupId, "call-started", { call });
  return res.status(201).json({ call });
});

groupRouter.post("/:groupId/call/end", requireAdmin, async (req, res) => {
  const ended = await store.endCall({ groupId: req.params.groupId });
  if (ended.error) {
    return res.status(400).json({ error: ended.error });
  }

  notify(req, req.params.groupId, "call-ended", {});
  return res.json({ ok: true });
});

groupRouter.get("/:groupId/summary/weekly", requireMember, async (req, res) => {
  const summary = store.getWeeklySummary(req.params.groupId);
  return res.json({ summary });
});

groupRouter.patch("/:groupId/members/:memberUserId/role", requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["admin", "member"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or member." });
  }

  const updated = await store.setMemberRole({
    groupId: req.params.groupId,
    targetUserId: req.params.memberUserId,
    role
  });
  if (updated.error) {
    return res.status(400).json({ error: updated.error });
  }

  notify(req, req.params.groupId, "member-role-updated", {
    userId: req.params.memberUserId,
    role
  });
  return res.json({ membership: updated });
});

groupRouter.delete("/:groupId/members/:memberUserId", requireAdmin, async (req, res) => {
  const result = await store.kickMember({
    groupId: req.params.groupId,
    targetUserId: req.params.memberUserId
  });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  notify(req, req.params.groupId, "member-kicked", { userId: req.params.memberUserId });
  return res.json({ ok: true });
});

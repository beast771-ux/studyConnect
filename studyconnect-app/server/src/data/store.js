import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createId, createJoinCode } from "../utils/id.js";
import { nowIso, withinLastDays } from "../utils/time.js";

const CATEGORIES = new Set(["doubt", "solution", "resource", "announcement", "explanation", "general"]);
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const dataDir = path.resolve(currentDir, "../../data");
const storeFile = path.join(dataDir, "runtime-store.json");

function normalizeCategory(category) {
  if (category === "explanation") return "solution";
  return category;
}

class InMemoryStore {
  constructor() {
    const state = this.loadState();
    this.users = state.users;
    this.groups = state.groups;
    this.memberships = state.memberships;
    this.topics = state.topics;
    this.messages = state.messages;
    this.resources = state.resources;
    this.events = state.events;
  }

  loadState() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(storeFile)) {
      return this.createEmptyState();
    }

    try {
      const raw = fs.readFileSync(storeFile, "utf8");
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        memberships: Array.isArray(parsed.memberships) ? parsed.memberships : [],
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        events: Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (error) {
      console.warn(`Failed to load local store (${error.message}). Starting fresh.`);
      return this.createEmptyState();
    }
  }

  createEmptyState() {
    return {
      users: [],
      groups: [],
      memberships: [],
      topics: [],
      messages: [],
      resources: [],
      events: []
    };
  }

  persistState() {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      storeFile,
      JSON.stringify(
        {
          users: this.users,
          groups: this.groups,
          memberships: this.memberships,
          topics: this.topics,
          messages: this.messages,
          resources: this.resources,
          events: this.events
        },
        null,
        2
      )
    );
  }

  sanitizeUser(user) {
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      bio: user.bio || "",
      department: user.department || "",
      semester: user.semester || "",
      avatarUrl: user.avatarUrl || "",
      avatarFileName: user.avatarFileName || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt || user.createdAt
    };
  }

  getUser(userId) {
    return this.users.find((user) => user._id === userId) || null;
  }

  getGroup(groupId) {
    return this.groups.find((group) => group._id === groupId) || null;
  }

  getTopic(topicId) {
    return this.topics.find((topic) => topic._id === topicId) || null;
  }

  getMessage(messageId) {
    return this.messages.find((message) => message._id === messageId) || null;
  }

  getEvent(eventId) {
    return this.events.find((event) => event._id === eventId) || null;
  }

  getResource(resourceId) {
    return this.resources.find((resource) => resource._id === resourceId) || null;
  }

  async createUser({ name, email, passwordHash }) {
    const timestamp = nowIso();
    const user = {
      _id: createId(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      bio: "",
      department: "",
      semester: "",
      avatarUrl: "",
      avatarFileName: "",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.users.push(user);
    this.persistState();
    return this.sanitizeUser(user);
  }

  async findUserByEmail(email) {
    return this.users.find((user) => user.email === email.toLowerCase().trim()) || null;
  }

  async findUserById(userId) {
    return this.sanitizeUser(this.getUser(userId));
  }

  async updateUserProfile(userId, profile) {
    const user = this.getUser(userId);
    if (!user) return null;

    if (typeof profile.name === "string" && profile.name.trim()) {
      user.name = profile.name.trim();
    }
    if (typeof profile.bio === "string") {
      user.bio = profile.bio.trim().slice(0, 300);
    }
    if (typeof profile.department === "string") {
      user.department = profile.department.trim().slice(0, 80);
    }
    if (typeof profile.semester === "string") {
      user.semester = profile.semester.trim().slice(0, 40);
    }
    if (typeof profile.avatarUrl === "string") {
      user.avatarUrl = profile.avatarUrl;
    }
    if (typeof profile.avatarFileName === "string") {
      user.avatarFileName = profile.avatarFileName;
    }

    user.updatedAt = nowIso();
    this.persistState();
    return this.sanitizeUser(user);
  }

  async updatePassword(userId, passwordHash) {
    const user = this.getUser(userId);
    if (!user) return null;
    user.passwordHash = passwordHash;
    user.updatedAt = nowIso();
    this.persistState();
    return this.sanitizeUser(user);
  }

  async createGroup({ name, description, createdBy }) {
    const group = {
      _id: createId(),
      name: name.trim(),
      description: (description || "").trim(),
      joinCode: createJoinCode(),
      createdBy,
      activeCall: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.groups.push(group);

    this.memberships.push({
      _id: createId(),
      groupId: group._id,
      userId: createdBy,
      role: "admin",
      joinedAt: nowIso()
    });

    const defaultTopics = ["General Discussion", "Resources Table"];
    for (const title of defaultTopics) {
      this.topics.push({
        _id: createId(),
        groupId: group._id,
        title,
        createdBy,
        createdAt: nowIso()
      });
    }

    this.persistState();
    return group;
  }

  async bootstrapUserWorkspace() {
    return null;
  }

  async isMember(groupId, userId) {
    return this.memberships.some(
      (membership) => membership.groupId === groupId && membership.userId === userId
    );
  }

  async getMembership(groupId, userId) {
    return (
      this.memberships.find(
        (membership) => membership.groupId === groupId && membership.userId === userId
      ) || null
    );
  }

  async listGroupsForUser(userId) {
    const memberships = this.memberships.filter((membership) => membership.userId === userId);
    return memberships
      .map((membership) => {
        const group = this.getGroup(membership.groupId);
        if (!group) return null;

        const topics = this.topics.filter((topic) => topic.groupId === group._id);
        const groupMessages = this.messages.filter((message) => message.groupId === group._id);
        const unresolvedDoubts = groupMessages.filter(
          (message) => message.category === "doubt" && !message.verifiedSolutionId
        ).length;

        return {
          ...group,
          role: membership.role,
          isDefaultAdmin: group.createdBy === userId,
          memberCount: this.memberships.filter((item) => item.groupId === group._id).length,
          topicCount: topics.length,
          unresolvedDoubts
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async joinGroupByCode({ joinCode, userId }) {
    const normalizedCode = joinCode.toUpperCase().trim();
    const group = this.groups.find((item) => item.joinCode === normalizedCode);
    if (!group) return { error: "Group with this join code does not exist." };

    const alreadyMember = await this.isMember(group._id, userId);
    if (!alreadyMember) {
      this.memberships.push({
        _id: createId(),
        groupId: group._id,
        userId,
        role: "member",
        joinedAt: nowIso()
      });
      this.persistState();
    }

    return { group };
  }

  async leaveGroup({ groupId, userId }) {
    const group = this.getGroup(groupId);
    if (!group) return { error: "Group not found." };
    if (group.createdBy === userId) {
      return { error: "Default admin cannot leave the group. Delete the group instead." };
    }

    const before = this.memberships.length;
    this.memberships = this.memberships.filter(
      (membership) => !(membership.groupId === groupId && membership.userId === userId)
    );
    if (this.memberships.length === before) {
      return { error: "You are not a member of this group." };
    }
    this.persistState();
    return { ok: true };
  }

  async deleteGroup({ groupId }) {
    this.groups = this.groups.filter((group) => group._id !== groupId);
    this.memberships = this.memberships.filter((membership) => membership.groupId !== groupId);
    this.topics = this.topics.filter((topic) => topic.groupId !== groupId);
    this.messages = this.messages.filter((message) => message.groupId !== groupId);
    this.resources = this.resources.filter((resource) => resource.groupId !== groupId);
    this.events = this.events.filter((event) => event.groupId !== groupId);
    this.persistState();
    return { ok: true };
  }

  async createTopic({ groupId, title, createdBy }) {
    const topic = {
      _id: createId(),
      groupId,
      title: title.trim(),
      createdBy,
      createdAt: nowIso()
    };
    this.topics.push(topic);
    this.persistState();
    return topic;
  }

  async createMessage({
    groupId,
    topicId,
    authorId,
    category,
    content,
    parentMessageId = null,
    verifyDoubtId = null
  }) {
    const normalizedCategory = normalizeCategory(category);
    if (!CATEGORIES.has(category) && !CATEGORIES.has(normalizedCategory)) {
      return { error: "Invalid message category." };
    }

    const topic = this.getTopic(topicId);
    if (!topic || topic.groupId !== groupId) {
      return { error: "Topic does not belong to this group." };
    }

    let normalizedParentMessageId = null;
    if (parentMessageId) {
      const parentMessage = this.getMessage(parentMessageId);
      if (!parentMessage || parentMessage.groupId !== groupId) {
        return { error: "Reply target not found in this group." };
      }
      if (parentMessage.topicId !== topicId) {
        return { error: "Replies must stay inside the same topic." };
      }
      normalizedParentMessageId = parentMessageId;
    }

    const message = {
      _id: createId(),
      groupId,
      topicId,
      authorId,
      category: normalizedCategory,
      content: content.trim(),
      parentMessageId: normalizedParentMessageId,
      verifiedSolutionId: null,
      pinned: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.messages.push(message);

    if (verifyDoubtId) {
      const verified = await this.resolveDoubt({
        groupId,
        doubtId: verifyDoubtId,
        solutionId: message._id,
        verifiedBy: authorId
      });
      if (verified.error) {
        return verified;
      }
    }

    this.persistState();
    return message;
  }

  async updateMessage({ groupId, messageId, content, category }) {
    const message = this.getMessage(messageId);
    if (!message || message.groupId !== groupId) {
      return { error: "Message not found in this group." };
    }

    if (typeof content === "string" && content.trim()) {
      message.content = content.trim();
    }
    if (typeof category === "string" && category.trim()) {
      const normalizedCategory = normalizeCategory(category.trim());
      if (!["doubt", "solution", "resource", "announcement", "general"].includes(normalizedCategory)) {
        return { error: "Invalid message category." };
      }
      message.category = normalizedCategory;
    }
    message.updatedAt = nowIso();
    this.persistState();
    return message;
  }

  async deleteMessage({ groupId, messageId }) {
    const message = this.getMessage(messageId);
    if (!message || message.groupId !== groupId) {
      return { error: "Message not found in this group." };
    }

    this.messages = this.messages.filter((item) => item._id !== messageId);

    for (const item of this.messages) {
      if (item.parentMessageId === messageId) {
        item.parentMessageId = null;
      }
      if (item.verifiedSolutionId === messageId) {
        item.verifiedSolutionId = null;
      }
    }

    for (const resource of this.resources) {
      if (resource.linkedDoubtId === messageId) {
        resource.linkedDoubtId = null;
      }
    }

    this.persistState();
    return { ok: true };
  }

  async setPinned({ groupId, messageId, pinned }) {
    const message = this.getMessage(messageId);
    if (!message || message.groupId !== groupId) {
      return { error: "Message not found in this group." };
    }

    message.pinned = Boolean(pinned);
    message.updatedAt = nowIso();
    this.persistState();
    return message;
  }

  async resolveDoubt({ groupId, doubtId, solutionId, answerId, verifiedBy }) {
    const finalSolutionId = solutionId || answerId;
    const doubt = this.getMessage(doubtId);
    const solution = this.getMessage(finalSolutionId);

    if (!doubt || doubt.groupId !== groupId || doubt.category !== "doubt") {
      return { error: "Doubt message not found." };
    }
    if (!solution || solution.groupId !== groupId || solution.category !== "solution") {
      return { error: "Solution message not found in this group." };
    }
    if (doubt.verifiedSolutionId) {
      return { error: "This doubt already has a verified solution." };
    }
    if (verifiedBy && doubt.authorId !== verifiedBy) {
      return { error: "Only the user who asked the doubt can verify the solution." };
    }

    doubt.verifiedSolutionId = finalSolutionId;
    doubt.pinned = true;
    doubt.updatedAt = nowIso();

    solution.pinned = true;
    solution.updatedAt = nowIso();
    this.persistState();
    return doubt;
  }

  async addResource({
    groupId,
    topicId,
    title,
    url,
    type,
    uploadedBy,
    resourceKind = "link",
    fileName = "",
    mimeType = "",
    fileSize = 0,
    linkedDoubtId = null
  }) {
    if (topicId) {
      const topic = this.getTopic(topicId);
      if (!topic || topic.groupId !== groupId) {
        return { error: "Topic not found for resource." };
      }
    }
    if (linkedDoubtId) {
      const doubt = this.getMessage(linkedDoubtId);
      if (!doubt || doubt.groupId !== groupId || doubt.category !== "doubt") {
        return { error: "Tagged doubt is invalid." };
      }
    }

    const resource = {
      _id: createId(),
      groupId,
      topicId: topicId || null,
      title: title.trim(),
      url: url.trim(),
      type: (type || "link").trim(),
      resourceKind: resourceKind === "file" ? "file" : "link",
      fileName: fileName || "",
      mimeType: mimeType || "",
      fileSize: Number(fileSize || 0),
      linkedDoubtId: linkedDoubtId || null,
      uploadedBy,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.resources.push(resource);
    this.persistState();
    return resource;
  }

  async updateResource({ groupId, resourceId, payload }) {
    const resource = this.getResource(resourceId);
    if (!resource || resource.groupId !== groupId) {
      return { error: "Resource not found." };
    }

    if (typeof payload.title === "string" && payload.title.trim()) {
      resource.title = payload.title.trim();
    }
    if (typeof payload.url === "string" && payload.url.trim()) {
      resource.url = payload.url.trim();
    }
    if (typeof payload.type === "string" && payload.type.trim()) {
      resource.type = payload.type.trim();
    }
    if (typeof payload.topicId === "string") {
      const topic = this.getTopic(payload.topicId);
      if (!topic || topic.groupId !== groupId) {
        return { error: "Topic not found for resource." };
      }
      resource.topicId = payload.topicId;
    }
    if (payload.topicId === null || payload.topicId === "") {
      resource.topicId = null;
    }
    if (typeof payload.linkedDoubtId === "string" && payload.linkedDoubtId.trim()) {
      const doubt = this.getMessage(payload.linkedDoubtId);
      if (!doubt || doubt.groupId !== groupId || doubt.category !== "doubt") {
        return { error: "Tagged doubt is invalid." };
      }
      resource.linkedDoubtId = payload.linkedDoubtId;
    }
    if (payload.linkedDoubtId === null || payload.linkedDoubtId === "") {
      resource.linkedDoubtId = null;
    }

    resource.updatedAt = nowIso();
    this.persistState();
    return resource;
  }

  async deleteResource({ groupId, resourceId }) {
    const resource = this.getResource(resourceId);
    if (!resource || resource.groupId !== groupId) {
      return { error: "Resource not found." };
    }
    this.resources = this.resources.filter((item) => item._id !== resourceId);
    this.persistState();
    return { ok: true };
  }

  async addEvent({ groupId, title, description, dueAt, createdBy }) {
    const event = {
      _id: createId(),
      groupId,
      title: title.trim(),
      description: (description || "").trim(),
      dueAt: new Date(dueAt).toISOString(),
      createdBy,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.events.push(event);
    this.persistState();
    return event;
  }

  async updateEvent({ groupId, eventId, payload }) {
    const event = this.getEvent(eventId);
    if (!event || event.groupId !== groupId) {
      return { error: "Event not found." };
    }

    if (typeof payload.title === "string" && payload.title.trim()) {
      event.title = payload.title.trim();
    }
    if (typeof payload.description === "string") {
      event.description = payload.description.trim();
    }
    if (typeof payload.dueAt === "string" && payload.dueAt.trim()) {
      event.dueAt = new Date(payload.dueAt).toISOString();
    }
    event.updatedAt = nowIso();
    this.persistState();
    return event;
  }

  async deleteEvent({ groupId, eventId }) {
    const event = this.getEvent(eventId);
    if (!event || event.groupId !== groupId) {
      return { error: "Event not found." };
    }
    this.events = this.events.filter((item) => item._id !== eventId);
    this.persistState();
    return { ok: true };
  }

  async setMemberRole({ groupId, targetUserId, role }) {
    const group = this.getGroup(groupId);
    if (!group) return { error: "Group not found." };
    if (group.createdBy === targetUserId && role !== "admin") {
      return { error: "Default admin cannot be removed from admin role." };
    }

    const membership = this.memberships.find(
      (item) => item.groupId === groupId && item.userId === targetUserId
    );
    if (!membership) return { error: "Member not found." };
    membership.role = role;
    this.persistState();
    return membership;
  }

  async kickMember({ groupId, targetUserId }) {
    const group = this.getGroup(groupId);
    if (!group) return { error: "Group not found." };
    if (group.createdBy === targetUserId) {
      return { error: "Cannot kick the group creator." };
    }

    const before = this.memberships.length;
    this.memberships = this.memberships.filter(
      (membership) => !(membership.groupId === groupId && membership.userId === targetUserId)
    );
    if (this.memberships.length === before) {
      return { error: "Member not found in this group." };
    }
    this.persistState();
    return { ok: true };
  }

  async startCall({ groupId, startedBy, topicId, url }) {
    const group = this.getGroup(groupId);
    if (!group) return { error: "Group not found." };
    if (group.activeCall) return { error: "An active call is already running." };

    group.activeCall = {
      roomUrl: url,
      topicId: topicId || null,
      startedBy,
      startedAt: nowIso()
    };
    group.updatedAt = nowIso();
    this.persistState();
    return group.activeCall;
  }

  async endCall({ groupId }) {
    const group = this.getGroup(groupId);
    if (!group) return { error: "Group not found." };
    if (!group.activeCall) return { error: "No active call found." };
    group.activeCall = null;
    group.updatedAt = nowIso();
    this.persistState();
    return { ok: true };
  }

  decorateMessage(message) {
    const author = this.sanitizeUser(this.getUser(message.authorId));
    const verifiedSolution = message.verifiedSolutionId
      ? this.messages.find((item) => item._id === message.verifiedSolutionId) || null
      : null;

    return {
      ...message,
      author,
      verifiedSolution
    };
  }

  decorateResource(resource) {
    return {
      ...resource,
      uploadedByUser: this.sanitizeUser(this.getUser(resource.uploadedBy))
    };
  }

  decorateEvent(event) {
    return {
      ...event,
      createdByUser: this.sanitizeUser(this.getUser(event.createdBy))
    };
  }

  getWeeklySummary(groupId) {
    const groupMessages = this.messages.filter((message) => message.groupId === groupId);
    const groupResources = this.resources.filter((resource) => resource.groupId === groupId);
    const groupEvents = this.events.filter((event) => event.groupId === groupId);

    const recentMessages = groupMessages.filter((message) => withinLastDays(message.createdAt, 7));
    const recentResources = groupResources.filter((resource) =>
      withinLastDays(resource.createdAt, 7)
    );

    const doubtsRaised = recentMessages.filter((message) => message.category === "doubt").length;
    const doubtsResolved = groupMessages.filter(
      (message) =>
        message.category === "doubt" &&
        Boolean(message.verifiedSolutionId) &&
        withinLastDays(message.updatedAt, 7)
    ).length;

    const categoryBreakdown = {
      doubt: 0,
      solution: 0,
      resource: 0,
      announcement: 0
    };
    const contributionMap = new Map();

    for (const message of recentMessages) {
      if (categoryBreakdown[message.category] !== undefined) {
        categoryBreakdown[message.category] += 1;
      }
      contributionMap.set(
        message.authorId,
        (contributionMap.get(message.authorId) || 0) + 1
      );
    }

    const contributors = Array.from(contributionMap.entries())
      .map(([userId, count]) => ({
        user: this.sanitizeUser(this.getUser(userId)),
        count
      }))
      .filter((item) => item.user)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
    const upcomingDeadlines = groupEvents.filter((event) => {
      const due = new Date(event.dueAt).getTime();
      return due >= now && due <= nextWeek;
    }).length;
    const overdueDeadlines = groupEvents.filter(
      (event) => new Date(event.dueAt).getTime() < now
    ).length;

    return {
      range: "Last 7 days",
      totalMessages: recentMessages.length,
      activeMembers: contributionMap.size,
      doubtsRaised,
      doubtsResolved,
      resourcesShared: recentResources.length,
      upcomingDeadlines,
      overdueDeadlines,
      categoryBreakdown,
      topContributors: contributors
    };
  }

  async getGroupDetails({ groupId }) {
    const group = this.getGroup(groupId);
    if (!group) return null;

    const members = this.memberships
      .filter((membership) => membership.groupId === groupId)
      .map((membership) => ({
        ...membership,
        user: this.sanitizeUser(this.getUser(membership.userId))
      }))
      .filter((membership) => membership.user);

    const topics = this.topics
      .filter((topic) => topic.groupId === groupId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const messages = this.messages
      .filter((message) => message.groupId === groupId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((message) => this.decorateMessage(message));

    const resources = this.resources
      .filter((resource) => resource.groupId === groupId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((resource) => this.decorateResource(resource));

    const events = this.events
      .filter((event) => event.groupId === groupId)
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
      .map((event) => this.decorateEvent(event));

    const weeklySummary = this.getWeeklySummary(groupId);

    return {
      group,
      members,
      topics,
      messages,
      resources,
      events,
      weeklySummary
    };
  }
}

export const store = new InMemoryStore();

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  register(payload) {
    return request("/auth/register", { method: "POST", body: payload });
  },
  login(payload) {
    return request("/auth/login", { method: "POST", body: payload });
  },
  resetPassword(payload) {
    return request("/auth/reset-password", { method: "POST", body: payload });
  },
  me(token) {
    return request("/auth/me", { token });
  },
  updateMe(token, payload) {
    return request("/auth/me", { method: "PATCH", token, body: payload });
  },
  async uploadAvatar(token, file) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch(`${API_BASE}/auth/me/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Avatar upload failed");
    }
    return data;
  },
  changePassword(token, payload) {
    return request("/auth/change-password", { method: "POST", token, body: payload });
  },
  listGroups(token) {
    return request("/groups", { token });
  },
  createGroup(token, payload) {
    return request("/groups", { method: "POST", token, body: payload });
  },
  joinGroup(token, payload) {
    return request("/groups/join", { method: "POST", token, body: payload });
  },
  leaveGroup(token, groupId) {
    return request(`/groups/${groupId}/leave`, { method: "POST", token });
  },
  deleteGroup(token, groupId) {
    return request(`/groups/${groupId}`, { method: "DELETE", token });
  },
  getGroup(token, groupId) {
    return request(`/groups/${groupId}`, { token });
  },
  createTopic(token, groupId, payload) {
    return request(`/groups/${groupId}/topics`, { method: "POST", token, body: payload });
  },
  createMessage(token, groupId, payload) {
    return request(`/groups/${groupId}/messages`, { method: "POST", token, body: payload });
  },
  updateMessage(token, groupId, messageId, payload) {
    return request(`/groups/${groupId}/messages/${messageId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  deleteMessage(token, groupId, messageId) {
    return request(`/groups/${groupId}/messages/${messageId}`, { method: "DELETE", token });
  },
  pinMessage(token, groupId, messageId, payload) {
    return request(`/groups/${groupId}/messages/${messageId}/pin`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  verifySolution(token, groupId, doubtId, payload) {
    return request(`/groups/${groupId}/doubts/${doubtId}/verify`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  addResource(token, groupId, payload) {
    return request(`/groups/${groupId}/resources`, { method: "POST", token, body: payload });
  },
  async uploadResourceFile(token, groupId, payload) {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("title", payload.title);
    formData.append("type", payload.type || "file");
    if (payload.topicId) {
      formData.append("topicId", payload.topicId);
    }

    const response = await fetch(`${API_BASE}/groups/${groupId}/resources/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "File upload failed");
    }
    return data;
  },
  updateResource(token, groupId, resourceId, payload) {
    return request(`/groups/${groupId}/resources/${resourceId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  deleteResource(token, groupId, resourceId) {
    return request(`/groups/${groupId}/resources/${resourceId}`, { method: "DELETE", token });
  },
  addEvent(token, groupId, payload) {
    return request(`/groups/${groupId}/events`, { method: "POST", token, body: payload });
  },
  updateEvent(token, groupId, eventId, payload) {
    return request(`/groups/${groupId}/events/${eventId}`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  deleteEvent(token, groupId, eventId) {
    return request(`/groups/${groupId}/events/${eventId}`, { method: "DELETE", token });
  },
  startCall(token, groupId, payload) {
    return request(`/groups/${groupId}/call/start`, { method: "POST", token, body: payload });
  },
  endCall(token, groupId) {
    return request(`/groups/${groupId}/call/end`, { method: "POST", token });
  },
  updateMemberRole(token, groupId, memberUserId, payload) {
    return request(`/groups/${groupId}/members/${memberUserId}/role`, {
      method: "PATCH",
      token,
      body: payload
    });
  },
  kickMember(token, groupId, memberUserId) {
    return request(`/groups/${groupId}/members/${memberUserId}`, {
      method: "DELETE",
      token
    });
  }
};

import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { store } from "../data/store.js";

export function initializeSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.data.userId = payload.userId;
      return next();
    } catch (error) {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-group", async ({ groupId }) => {
      const userId = socket.data.userId;
      if (!userId || !groupId) return;
      const isMember = await store.isMember(groupId, userId);
      if (!isMember) return;
      socket.join(`group:${groupId}`);
      socket.emit("joined-group", { groupId });
    });

    socket.on("leave-group", ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group:${groupId}`);
    });
  });
}

export function emitGroupUpdate(io, groupId, event, payload = {}) {
  io.to(`group:${groupId}`).emit("group-updated", {
    groupId,
    event,
    payload,
    timestamp: new Date().toISOString()
  });
}

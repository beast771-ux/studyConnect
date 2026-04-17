import fs from "node:fs";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config } from "./config/env.js";
import { clientDistDir, clientIndexPath, uploadsDir } from "./config/paths.js";
import { connectDatabase, getDatabaseMode } from "./config/database.js";
import { authRouter } from "./routes/authRoutes.js";
import { groupRouter } from "./routes/groupRoutes.js";
import { initializeSocket } from "./socket/index.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.clientOrigin,
    credentials: true
  }
});
initializeSocket(io);
app.locals.io = io;

const hasClientBuild = fs.existsSync(clientIndexPath);

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

if (hasClientBuild) {
  app.use(express.static(clientDistDir));
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: getDatabaseMode(),
    service: "StudyConnect API"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/groups", groupRouter);

app.use((req, res) => {
  const isBackendRoute =
    req.path.startsWith("/api") ||
    req.path.startsWith("/socket.io") ||
    req.path.startsWith("/uploads");

  if (!isBackendRoute && hasClientBuild) {
    return res.sendFile(clientIndexPath);
  }

  if (!isBackendRoute) {
    return res.status(404).json({
      error: "Client build not found. Run the client build before starting the hosted server."
    });
  }

  res.status(404).json({ error: "Route not found." });
});

connectDatabase().then(() => {
  server.listen(config.port, () => {
    console.log(`StudyConnect server running on http://localhost:${config.port}`);
  });
});

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import groupRoutes from "./routes/groupRoutes.js";
import connectDB from "./config/db.js";
import { registerUser, loginUser } from "./controllers/authController.js";

import analyticsRoutes from "./routes/analyticsRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

import chatHandler from "./sockets/chatHandler.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

/* ---------- dirname fix ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- uploads ---------- */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------- AUTH ROUTES ---------- */

app.post("/api/auth/signup", registerUser);
app.post("/api/auth/login", loginUser);

/* ---------- YOUR ROUTES ---------- */

app.use("/api/analytics", analyticsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/groups", groupRoutes);
/* ---------- HTTP SERVER ---------- */

const server = http.createServer(app);

/* ---------- SOCKET.IO ---------- */

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

chatHandler(io);

/* ---------- SERVER START ---------- */

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
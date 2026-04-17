import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { avatarsDir } from "../config/paths.js";
import { store } from "../data/store.js";
import { authenticate, signToken } from "../middleware/auth.js";

export const authRouter = express.Router();

fs.mkdirSync(avatarsDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, avatarsDir);
    },
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 50);
      const safeBase = base || "avatar";
      callback(null, `${Date.now()}-${safeBase}${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

function uploadAvatar(req, res, next) {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({ error: error.message || "Avatar upload failed." });
  });
}

authRouter.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existing = await store.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "User with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await store.createUser({ name, email, passwordHash });
  const token = signToken(user._id);
  return res.status(201).json({ token, user });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const userRecord = await store.findUserByEmail(email);
  if (!userRecord) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const isMatch = await bcrypt.compare(password, userRecord.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const user = await store.findUserById(userRecord._id);
  const token = signToken(user._id);
  return res.json({ token, user });
});

authRouter.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const userRecord = await store.findUserByEmail(email);
  if (!userRecord) {
    return res.status(404).json({ error: "No account found for this email." });
  }

  const tempPassword = crypto.randomBytes(8).toString("base64url").slice(0, 10);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await store.updatePassword(userRecord._id, passwordHash);

  return res.json({
    tempPassword,
    message:
      "Temporary password generated. Use this to sign in, then change password in profile settings."
  });
});

authRouter.get("/me", authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

authRouter.patch("/me", authenticate, async (req, res) => {
  const { name, bio, department, semester } = req.body;
  if (typeof name === "string" && !name.trim()) {
    return res.status(400).json({ error: "Name cannot be empty." });
  }

  const updated = await store.updateUserProfile(req.user._id, {
    name,
    bio,
    department,
    semester
  });
  if (!updated) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json({ user: updated });
});

authRouter.post("/me/avatar", authenticate, uploadAvatar, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please choose an image file." });
  }

  const user = await store.updateUserProfile(req.user._id, {
    avatarUrl: `/uploads/avatars/${req.file.filename}`,
    avatarFileName: req.file.originalname
  });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.json({ user });
});

authRouter.post("/change-password", authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "oldPassword and newPassword are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const userRecord = await store.findUserByEmail(req.user.email);
  if (!userRecord) {
    return res.status(404).json({ error: "User not found." });
  }

  const isMatch = await bcrypt.compare(oldPassword, userRecord.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Old password is incorrect." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await store.updatePassword(req.user._id, passwordHash);

  return res.json({ message: "Password updated successfully." });
});

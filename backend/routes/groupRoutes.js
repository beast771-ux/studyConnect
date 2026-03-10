import express from "express";

import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  createTopic,
  getTopics
} from "../controllers/groupController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ---------- GROUP CRUD ---------- */

// Create group
router.post("/", protect, createGroup);

// Get all groups
router.get("/", protect, getGroups);

// Get single group
router.get("/:id", protect, getGroupById);

// Update group
router.put("/:id", protect, updateGroup);

// Delete group
router.delete("/:id", protect, deleteGroup);


/* ---------- MEMBER MANAGEMENT ---------- */

// Add member to group
router.post("/:id/add-member", protect, addMember);


/* ---------- TOPIC ROUTES ---------- */

// Create topic inside group
router.post("/:groupId/topics", protect, createTopic);

// Get all topics of a group
router.get("/:groupId/topics", protect, getTopics);


export default router;
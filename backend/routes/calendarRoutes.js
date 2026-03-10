import express from "express";
import { createEvent, getGroupEvents } from "../controllers/calendarController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, createEvent);

router.get("/group/:groupId", protect, getGroupEvents);

export default router;
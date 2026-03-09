import express from "express";
import { createEvent, getGroupEvents } from "../controllers/calendarController.js";

const router = express.Router();

router.post("/create", createEvent);

router.get("/group/:groupId", getGroupEvents);

export default router;
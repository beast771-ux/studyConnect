import express from "express";
import { getGroupActivity } from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/group/:groupId/activity", getGroupActivity);

export default router;
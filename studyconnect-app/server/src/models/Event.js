import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

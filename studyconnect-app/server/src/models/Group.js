import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    joinCode: { type: String, required: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activeCall: {
      roomUrl: { type: String, default: "" },
      topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      startedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

export const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

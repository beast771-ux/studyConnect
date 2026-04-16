import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: null },
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: "link" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resourceKind: { type: String, enum: ["link", "file"], default: "link" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    linkedDoubtId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null }
  },
  { timestamps: true }
);

export const Resource =
  mongoose.models.Resource || mongoose.model("Resource", resourceSchema);

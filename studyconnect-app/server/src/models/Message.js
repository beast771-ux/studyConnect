import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["doubt", "solution", "resource", "announcement"],
      required: true
    },
    content: { type: String, required: true },
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    verifiedSolutionId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    pinned: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" }
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export const Membership =
  mongoose.models.Membership || mongoose.model("Membership", membershipSchema);

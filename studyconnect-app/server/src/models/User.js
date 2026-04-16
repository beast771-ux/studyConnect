import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: "" },
    department: { type: String, default: "" },
    semester: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    avatarFileName: { type: String, default: "" }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);

import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  topics: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic"
    }
  ]
},
{ timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },

  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  }
},
{ timestamps: true }
);

const Topic = mongoose.model("Topic", topicSchema);

export default Topic;
import Message from "../models/Message.js";

export const getGroupActivity = async (req, res) => {
  try {

    const groupId = req.params.groupId;

    const userStats = await Message.aggregate([
      { $match: { groupId: groupId } },
      {
        $group: {
          _id: "$sender",
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { messageCount: -1 } }
    ]);

    const topicStats = await Message.aggregate([
      { $match: { groupId: groupId } },
      {
        $group: {
          _id: "$topicId",
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { messageCount: -1 } }
    ]);

    const totalMessages = await Message.countDocuments({ groupId });

    res.json({
      totalMessages,
      userStats,
      topicStats
    });

  } catch (error) {

    console.log(error);
    res.status(500).json({ error: "Server error" });

  }
};
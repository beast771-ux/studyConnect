import Group from "../models/Group.js";
import Topic from "../models/Topic.js";

/* ---------- CREATE GROUP ---------- */

export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    const group = await Group.create({
      name,
      description,
      creator: req.user.id,
      members: [req.user.id]
    });

    res.status(201).json(group);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- GET ALL GROUPS ---------- */

export const getGroups = async (req, res) => {
  try {

    const groups = await Group.find()
      .populate("members", "name email")
      .populate("topics");

    res.json(groups);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- GET SINGLE GROUP ---------- */

export const getGroupById = async (req, res) => {
  try {

    const group = await Group.findById(req.params.id)
      .populate("members", "name email")
      .populate("topics");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(group);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- UPDATE GROUP ---------- */

export const updateGroup = async (req, res) => {
  try {

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(group);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- DELETE GROUP ---------- */

export const deleteGroup = async (req, res) => {
  try {

    await Group.findByIdAndDelete(req.params.id);

    res.json({ message: "Group deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- ADD MEMBER ---------- */

export const addMember = async (req, res) => {
  try {

    const { userId } = req.body;

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } },
      { new: true }
    ).populate("members");

    res.json(group);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- CREATE TOPIC ---------- */

export const createTopic = async (req, res) => {
  try {

    const { name } = req.body;
    const groupId = req.params.groupId;

    const topic = await Topic.create({
      name,
      group: groupId
    });

    await Group.findByIdAndUpdate(
      groupId,
      { $push: { topics: topic._id } }
    );

    res.status(201).json(topic);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------- GET TOPICS ---------- */

export const getTopics = async (req, res) => {
  try {

    const topics = await Topic.find({
      group: req.params.groupId
    });

    res.json(topics);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
import Message from "../models/Message.js";

export const uploadFile = async (req, res) => {

  try {

    const { groupId, topicId, sender } = req.body;
    const file = req.file;

    let type = "none";

    if(file.mimetype.startsWith("image")) type = "image";
    else if(file.mimetype === "application/pdf") type = "pdf";
    else if(file.mimetype.startsWith("video")) type = "video";

    const message = new Message({
      groupId,
      topicId,
      sender,
      fileUrl: "/uploads/" + file.filename,
      fileType: type,
      category: "resource"
    });

    await message.save();

    res.json(message);

  } catch(err){

    console.log(err);
    res.status(500).json({ error:"Upload failed" });

  }

};
import Message from "../models/Message.js";

export default function chatHandler(io){

  io.on("connection",(socket)=>{

    socket.on("pinMessage", async(messageId)=>{

      try{

        const message = await Message.findByIdAndUpdate(
          messageId,
          { pinned:true },
          { new:true }
        );

        io.to(message.groupId).emit("messagePinned", message);

      }catch(err){
        console.log(err);
      }

    });

    console.log("User connected:", socket.id);

    socket.on("joinTopic",(data)=>{

      const room = data.groupId + "_" + data.topicId;

      socket.join(room);

      console.log("User joined topic:",room);

    });

    socket.on("sendMessage", async(data)=>{

      try{

        const message = new Message({
          groupId:data.groupId,
          topicId:data.topicId,
          sender:data.sender,
          text:data.text,
          category:data.category,
          parentDoubt:data.parentDoubt || null
        });

        await message.save();

        io.to(data.groupId + "_" + data.topicId).emit("receiveMessage",message);

      }catch(err){
        console.log(err);
      }

    });

    socket.on("resolveDoubt", async(doubtId)=>{

      try{

        await Message.findByIdAndUpdate(doubtId,{
          resolved:true
        });

        io.emit("doubtResolved", doubtId);

      }catch(err){
        console.log(err);
      }

    });

  });

}
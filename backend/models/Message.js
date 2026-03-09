import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  groupId:{
    type:String,
    required:true
  },
  topicId:{
    type:String,
    required:true
  },
  sender:{
    type:String,
    required:true
  },
  text:{
    type:String
  },
  fileUrl:{
    type:String
  },
  fileType:{
    type:String
  },
  category:{
    type:String
  },
  parentDoubt:{
    type:String,
    default:null
  },
  resolved:{
    type:Boolean,
    default:false
  },
  pinned:{
    type:Boolean,
    default:false
  },
  createdAt:{
    type:Date,
    default:Date.now
  }
});

export default mongoose.model("Message", messageSchema);
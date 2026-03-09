import mongoose from "mongoose";

const calendarSchema = new mongoose.Schema({
  groupId:{
    type:String,
    required:true
  },
  title:{
    type:String,
    required:true
  },
  description:{
    type:String,
    default:""
  },
  eventType:{
    type:String,
    enum:["deadline","meeting","exam"],
    default:"deadline"
  },
  createdBy:{
    type:String,
    required:true
  },
  eventDate:{
    type:Date,
    required:true
  },
  createdAt:{
    type:Date,
    default:Date.now
  }
});

export default mongoose.model("CalendarEvent",calendarSchema);
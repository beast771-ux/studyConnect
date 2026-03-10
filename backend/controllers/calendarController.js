import CalendarEvent from "../models/CalendarEvent.js";

export const createEvent = async (req,res)=>{
  try{

    const event = new CalendarEvent({
      ...req.body,
      createdBy: req.user.id   // add this
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event
    });

  }catch(err){
    console.log(err);

    res.status(500).json({
      success:false,
      message:"Internal server error"
    });
  }
};

export const getGroupEvents = async (req,res)=>{
  try{

    const groupId = req.params.groupId;

    const events = await CalendarEvent.find({
      groupId:groupId
    }).sort({eventDate:1});

    res.json(events);

  }catch(err){

    console.log(err);
    res.status(500).json({error:"Failed to fetch events"});

  }
};
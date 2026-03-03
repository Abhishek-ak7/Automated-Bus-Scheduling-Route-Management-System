const Schedule = require('../models/Schedule');
const Trip = require('../models/Trip');

/* Helper function: generate trips */
const generateTrips = async (schedule) => {

  const [startHour,startMin] = schedule.startTime.split(':');
  const [endHour,endMin] = schedule.endTime.split(':');

  let current = new Date();
  current.setHours(startHour,startMin,0,0);

  let end = new Date();
  end.setHours(endHour,endMin,0,0);

  while(current <= end){

    await Trip.create({
      schedule:schedule._id,
      route:schedule.route,
      bus:schedule.bus,
      plannedStartTime:new Date(current),
      plannedEndTime:new Date(current.getTime()+60*60*1000) // temp 1hr trip
    });

    current = new Date(current.getTime() + schedule.frequency*60000);
  }
};

/* Create Schedule */
exports.createSchedule = async (req,res)=>{
  try{
    const schedule = await Schedule.create(req.body);

    // auto create trips
    await generateTrips(schedule);

    res.status(201).json({success:true,data:schedule});
  }catch(err){
    res.status(400).json({success:false,message:err.message});
  }
};

/* Get schedules */
exports.getSchedules = async (req,res)=>{
  try{
    const schedules = await Schedule.find()
      .populate('route','routeName routeCode')
      .populate('bus','busNumber');

    res.json({success:true,count:schedules.length,data:schedules});
  }catch(err){
    res.status(500).json({success:false,message:err.message});
  }
};

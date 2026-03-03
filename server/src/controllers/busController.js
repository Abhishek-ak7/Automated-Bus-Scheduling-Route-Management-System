const Bus = require('../models/Bus');

/* Get all buses */
exports.getAllBuses = async (req,res)=>{
  try{
    const buses = await Bus.find()
      .populate('assignedRoute','routeName routeCode')
      .populate('assignedDriver','name email');

    res.json({success:true,count:buses.length,data:buses});
  }catch(err){
    res.status(500).json({success:false,message:err.message});
  }
};

/* Create Bus (admin only) */
exports.createBus = async (req,res)=>{
  try{
    const bus = await Bus.create(req.body);
    res.status(201).json({success:true,data:bus});
  }catch(err){
    res.status(400).json({success:false,message:err.message});
  }
};

/* Assign route to bus */
exports.assignRoute = async (req,res)=>{
  try{
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {assignedRoute:req.body.routeId},
      {new:true}
    );

    res.json({success:true,data:bus});
  }catch(err){
    res.status(400).json({success:false,message:err.message});
  }
};
/* update live location (driver) */
exports.updateLocation = async (busId, lat, lng) => {
  try {
    await require('../models/Bus').findByIdAndUpdate(busId, {
      currentLocation: {
        lat,
        lng,
        lastUpdated: new Date()
      }
    });
  } catch (err) {
    console.log("Location update error:", err.message);
  }
};

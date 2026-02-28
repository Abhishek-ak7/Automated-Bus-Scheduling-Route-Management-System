const Route = require('../models/Route');

/* GET all routes */
exports.getAllRoutes = async (req,res)=>{
  try{
    const routes = await Route.find().populate('stops.stopId','stopName stopCode');
    res.json({success:true,count:routes.length,data:routes});
  }catch(err){
    res.status(500).json({success:false,message:err.message});
  }
};

/* CREATE route (admin only) */
exports.createRoute = async (req,res)=>{
  try{
    const route = await Route.create(req.body);
    res.status(201).json({success:true,data:route});
  }catch(err){
    res.status(400).json({success:false,message:err.message});
  }
};

/* GET single route */
exports.getRoute = async (req,res)=>{
  try{
    const route = await Route.findById(req.params.id)
      .populate('stops.stopId','stopName stopCode location');

    if(!route)
      return res.status(404).json({success:false,message:"Route not found"});

    res.json({success:true,data:route});
  }catch(err){
    res.status(500).json({success:false,message:err.message});
  }
};

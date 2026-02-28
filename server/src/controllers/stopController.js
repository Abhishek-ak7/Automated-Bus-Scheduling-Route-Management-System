const Stop = require('../models/Stop');

/* GET all stops */
exports.getAllStops = async (req, res) => {
  try {
    const stops = await Stop.find({ isActive: true });
    res.json({ success: true, count: stops.length, data: stops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* CREATE stop (admin only) */
exports.createStop = async (req, res) => {
  try {
    const stop = await Stop.create(req.body);
    res.status(201).json({ success: true, data: stop });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/* UPDATE stop */
exports.updateStop = async (req, res) => {
  try {
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!stop)
      return res.status(404).json({ success:false, message:"Stop not found" });

    res.json({ success:true, data: stop });

  } catch (err) {
    res.status(400).json({ success:false, message: err.message });
  }
};

/* DELETE (soft delete) */
exports.deleteStop = async (req, res) => {
  try {
    await Stop.findByIdAndUpdate(req.params.id, { isActive:false });
    res.json({ success:true, message:"Stop deactivated" });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

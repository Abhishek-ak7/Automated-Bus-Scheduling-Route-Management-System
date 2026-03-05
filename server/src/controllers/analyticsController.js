const Trip = require("../models/Trip");

exports.getDashboardStats = async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0,0,0,0);

    /* trips today */
    const tripsToday = await Trip.countDocuments({
      plannedStartTime: { $gte: today }
    });

    /* active buses */
    const activeBuses = await Trip.countDocuments({
      status: "running"
    });

    /* on-time trips */
    const onTimeTrips = await Trip.countDocuments({
      delayMinutes: { $lte: 5 }
    });

    /* total completed */
    const completedTrips = await Trip.countDocuments({
      status: "completed"
    });

    const onTimePercentage =
      completedTrips === 0
      ? 0
      : Math.round((onTimeTrips / completedTrips) * 100);

    /* avg delay */
    const delayAgg = await Trip.aggregate([
      { $match: { delayMinutes: { $gte: 0 } } },
      { $group: { _id: null, avgDelay: { $avg: "$delayMinutes" } } }
    ]);

    const avgDelay =
      delayAgg.length > 0
      ? Math.round(delayAgg[0].avgDelay)
      : 0;

    res.json({
      activeBuses,
      tripsToday,
      onTimePercentage,
      avgDelay
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

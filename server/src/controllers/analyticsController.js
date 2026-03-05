const Trip = require("../models/Trip");

exports.getDashboardStats = async (req, res) => {
  try {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* Trips today */
    const tripsToday = await Trip.countDocuments({
      plannedStartTime: { $gte: today }
    });

    /* Active buses (running trips) */
    const activeBuses = await Trip.countDocuments({
      status: "running"
    });

    /* Completed trips today */
    const completedTrips = await Trip.countDocuments({
      status: "completed",
      plannedStartTime: { $gte: today }
    });

    /* On-time trips (completed with delay <= 5 min) */
    const onTimeTrips = await Trip.countDocuments({
      status: "completed",
      delayMinutes: { $lte: 5 },
      plannedStartTime: { $gte: today }
    });

    /* Calculate percentage */
    const onTimePercentage =
      completedTrips === 0
        ? 0
        : Math.round((onTimeTrips / completedTrips) * 100);

    /* Average delay (only completed trips today) */
    const delayAgg = await Trip.aggregate([
      {
        $match: {
          status: "completed",
          plannedStartTime: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          avgDelay: { $avg: "$delayMinutes" }
        }
      }
    ]);

    const avgDelay =
      delayAgg.length > 0
        ? Math.round(delayAgg[0].avgDelay)
        : 0;

    res.json({
      success: true,
      data: {
        activeBuses,
        tripsToday,
        onTimePercentage,
        avgDelay
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
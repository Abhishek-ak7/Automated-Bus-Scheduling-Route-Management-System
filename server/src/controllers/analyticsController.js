const Trip = require("../models/Trip");
const Bus = require("../models/Bus");
const Route = require("../models/Route");

/* ─── helpers ─── */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfDay = (daysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ═══════════════════════════════════════════════
   1. DASHBOARD KPI STATS  (existing, enriched)
   ═══════════════════════════════════════════════ */
exports.getDashboardStats = async (req, res) => {
  try {
    const today = startOfToday();
    const yesterday = startOfDay(1);

    /* ── today counts ── */
    const [tripsToday, activeBuses, completedTrips, onTimeTrips, scheduledTrips, cancelledTrips] =
      await Promise.all([
        Trip.countDocuments({ plannedStartTime: { $gte: today } }),
        Trip.countDocuments({ status: "running" }),
        Trip.countDocuments({ status: "completed", plannedStartTime: { $gte: today } }),
        Trip.countDocuments({ status: "completed", delayMinutes: { $lte: 5 }, plannedStartTime: { $gte: today } }),
        Trip.countDocuments({ status: "scheduled", plannedStartTime: { $gte: today } }),
        Trip.countDocuments({ status: "cancelled", plannedStartTime: { $gte: today } }),
      ]);

    /* ── yesterday counts for trend ── */
    const [tripsYesterday, completedYesterday, onTimeYesterday] = await Promise.all([
      Trip.countDocuments({ plannedStartTime: { $gte: yesterday, $lt: today } }),
      Trip.countDocuments({ status: "completed", plannedStartTime: { $gte: yesterday, $lt: today } }),
      Trip.countDocuments({ status: "completed", delayMinutes: { $lte: 5 }, plannedStartTime: { $gte: yesterday, $lt: today } }),
    ]);

    const onTimePercentage = completedTrips === 0 ? 0 : Math.round((onTimeTrips / completedTrips) * 100);
    const onTimeYesterdayPct = completedYesterday === 0 ? 0 : Math.round((onTimeYesterday / completedYesterday) * 100);

    /* ── avg delay ── */
    const delayAgg = await Trip.aggregate([
      { $match: { status: "completed", plannedStartTime: { $gte: today } } },
      { $group: { _id: null, avgDelay: { $avg: "$delayMinutes" } } },
    ]);
    const avgDelay = delayAgg.length > 0 ? Math.round(delayAgg[0].avgDelay * 10) / 10 : 0;

    const delayAggYesterday = await Trip.aggregate([
      { $match: { status: "completed", plannedStartTime: { $gte: yesterday, $lt: today } } },
      { $group: { _id: null, avgDelay: { $avg: "$delayMinutes" } } },
    ]);
    const avgDelayYesterday = delayAggYesterday.length > 0 ? Math.round(delayAggYesterday[0].avgDelay * 10) / 10 : 0;

    /* total fleet */
    const totalBuses = await Bus.countDocuments();

    res.json({
      success: true,
      data: {
        activeBuses,
        totalBuses,
        tripsToday,
        scheduledTrips,
        completedTrips,
        cancelledTrips,
        onTimePercentage,
        avgDelay,
        trends: {
          trips: tripsYesterday === 0 ? 0 : Math.round(((tripsToday - tripsYesterday) / tripsYesterday) * 100),
          onTime: onTimePercentage - onTimeYesterdayPct,
          delay: avgDelayYesterday === 0 ? 0 : Math.round(((avgDelay - avgDelayYesterday) / avgDelayYesterday) * 100),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════
   2. HOURLY TRIP DISTRIBUTION (today)
   ═══════════════════════════════════════════════ */
exports.getHourlyTrips = async (req, res) => {
  try {
    const today = startOfToday();

    const hourly = await Trip.aggregate([
      { $match: { plannedStartTime: { $gte: today } } },
      {
        $group: {
          _id: { $hour: "$plannedStartTime" },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ["$status", "running"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    /* fill 0–23 hours */
    const result = Array.from({ length: 24 }, (_, i) => {
      const found = hourly.find((h) => h._id === i);
      return {
        hour: `${String(i).padStart(2, "0")}:00`,
        total: found?.total || 0,
        completed: found?.completed || 0,
        running: found?.running || 0,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════
   3. DAILY TRIP TREND (last 7 days)
   ═══════════════════════════════════════════════ */
exports.getDailyTrips = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const from = startOfDay(days - 1);

    const daily = await Trip.aggregate([
      { $match: { plannedStartTime: { $gte: from } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$plannedStartTime" },
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          onTime: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $lte: ["$delayMinutes", 5] }] }, 1, 0],
            },
          },
          avgDelay: { $avg: "$delayMinutes" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    /* fill missing dates */
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = daily.find((r) => r._id === dateStr);
      result.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        total: found?.total || 0,
        completed: found?.completed || 0,
        onTime: found?.onTime || 0,
        avgDelay: found ? Math.round(found.avgDelay * 10) / 10 : 0,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════
   4. FLEET STATUS BREAKDOWN
   ═══════════════════════════════════════════════ */
exports.getFleetStatus = async (req, res) => {
  try {
    const [statusCounts, typeCounts, runningBusIds] = await Promise.all([
      Bus.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Bus.aggregate([{ $group: { _id: "$busType", count: { $sum: 1 } } }]),
      Trip.distinct("bus", { status: "running" }),
    ]);

    const statusMap = {};
    statusCounts.forEach((s) => (statusMap[s._id] = s.count));

    const typeMap = {};
    typeCounts.forEach((t) => (typeMap[t._id] = t.count));

    res.json({
      success: true,
      data: {
        byStatus: {
          active: statusMap.active || 0,
          maintenance: statusMap.maintenance || 0,
          inactive: statusMap.inactive || 0,
        },
        byType: typeMap,
        onRoute: runningBusIds.length,
        total: (statusMap.active || 0) + (statusMap.maintenance || 0) + (statusMap.inactive || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════
   5. ROUTE PERFORMANCE (top routes by trips)
   ═══════════════════════════════════════════════ */
exports.getRoutePerformance = async (req, res) => {
  try {
    const today = startOfToday();
    const limit = parseInt(req.query.limit) || 10;

    const perf = await Trip.aggregate([
      { $match: { plannedStartTime: { $gte: today } } },
      {
        $group: {
          _id: "$route",
          totalTrips: { $sum: 1 },
          completedTrips: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          onTimeTrips: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $lte: ["$delayMinutes", 5] }] }, 1, 0],
            },
          },
          avgDelay: { $avg: "$delayMinutes" },
          cancelledTrips: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
      { $sort: { totalTrips: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "routes",
          localField: "_id",
          foreignField: "_id",
          as: "routeInfo",
        },
      },
      { $unwind: { path: "$routeInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          routeName: "$routeInfo.routeName",
          routeCode: "$routeInfo.routeCode",
          routeType: "$routeInfo.routeType",
          totalTrips: 1,
          completedTrips: 1,
          onTimeTrips: 1,
          cancelledTrips: 1,
          avgDelay: { $round: ["$avgDelay", 1] },
          onTimePct: {
            $cond: [
              { $eq: ["$completedTrips", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$onTimeTrips", "$completedTrips"] }, 100] }, 0] },
            ],
          },
        },
      },
    ]);

    res.json({ success: true, data: perf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════
   6. DELAY DISTRIBUTION (histogram buckets)
   ═══════════════════════════════════════════════ */
exports.getDelayDistribution = async (req, res) => {
  try {
    const today = startOfToday();

    const delays = await Trip.aggregate([
      { $match: { status: "completed", plannedStartTime: { $gte: today } } },
      {
        $bucket: {
          groupBy: "$delayMinutes",
          boundaries: [0, 2, 5, 10, 15, 20, 30, 60, Infinity],
          default: "60+",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const labels = ["0–2 min", "2–5 min", "5–10 min", "10–15 min", "15–20 min", "20–30 min", "30–60 min", "60+ min"];
    const boundaries = [0, 2, 5, 10, 15, 20, 30, 60, "60+"];

    const result = boundaries.slice(0, -1).map((b, i) => {
      const found = delays.find((d) => d._id === b);
      return { label: labels[i], count: found?.count || 0 };
    });
    /* handle 60+ bucket */
    const overSixty = delays.find((d) => d._id === "60+");
    if (overSixty) {
      result.push({ label: "60+ min", count: overSixty.count });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
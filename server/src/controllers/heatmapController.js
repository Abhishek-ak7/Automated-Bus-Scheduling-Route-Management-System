const DemandLog = require("../models/DemandLog");
const Stop = require("../models/Stop");

/* ────────── helper: log a demand event (fire-and-forget) ────── */
exports.logDemand = async (stopId, source, routeId = null) => {
  try {
    const stop = await Stop.findById(stopId).select("location").lean();
    if (!stop?.location) return;
    await DemandLog.create({
      stop: stopId,
      source,
      route: routeId || undefined,
      location: { lat: stop.location.lat, lng: stop.location.lng },
    });
  } catch {
    /* silent — demand logging must never break the main flow */
  }
};

/* ═══════════════════════════════════════════════════════════════ */
/*           GET /api/heatmap  — aggregate demand data            */
/* ═══════════════════════════════════════════════════════════════ */

/**
 * Query params:
 *   hours  — look-back window in hours (default 24, max 720 = 30 days)
 *   source — optional filter (arrival_check | trip_search | nearby_search | map_tap)
 *
 * Returns per-stop demand counts + coordinates ready for the heatmap layer.
 */
exports.getHeatmapData = async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 720);
    const since = new Date(Date.now() - hours * 3600_000);

    const matchStage = { createdAt: { $gte: since } };
    if (req.query.source) matchStage.source = req.query.source;

    /* aggregate demand per stop */
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$stop",
          count: { $sum: 1 },
          lat: { $first: "$location.lat" },
          lng: { $first: "$location.lng" },
          lastEvent: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const agg = await DemandLog.aggregate(pipeline);

    /* look up stop names */
    const stopIds = agg.map((a) => a._id);
    const stops = await Stop.find({ _id: { $in: stopIds } })
      .select("stopName stopCode")
      .lean();
    const stopMap = {};
    for (const s of stops) stopMap[s._id.toString()] = s;

    /* find max count for intensity normalisation */
    const maxCount = agg.length > 0 ? agg[0].count : 1;

    const data = agg.map((a) => {
      const s = stopMap[a._id.toString()] || {};
      return {
        stopId: a._id,
        stopName: s.stopName || "Unknown",
        stopCode: s.stopCode || "—",
        lat: a.lat,
        lng: a.lng,
        count: a.count,
        intensity: Math.round((a.count / maxCount) * 100) / 100, // 0..1
        lastEvent: a.lastEvent,
      };
    });

    /* summary stats */
    const totalDemand = agg.reduce((s, a) => s + a.count, 0);

    res.json({
      success: true,
      hours,
      totalDemand,
      stopsCount: data.length,
      maxDemand: maxCount,
      data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════ */
/*  GET /api/heatmap/stats — quick summary for dashboard cards    */
/* ═══════════════════════════════════════════════════════════════ */

exports.getHeatmapStats = async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 720);
    const since = new Date(Date.now() - hours * 3600_000);

    const [total, bySource, topStops] = await Promise.all([
      DemandLog.countDocuments({ createdAt: { $gte: since } }),

      DemandLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),

      DemandLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$stop", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    /* resolve stop names for top 5 */
    const topIds = topStops.map((t) => t._id);
    const stopDocs = await Stop.find({ _id: { $in: topIds } })
      .select("stopName stopCode")
      .lean();
    const sm = {};
    for (const s of stopDocs) sm[s._id.toString()] = s;

    res.json({
      success: true,
      hours,
      totalEvents: total,
      bySource: bySource.reduce((o, s) => ({ ...o, [s._id]: s.count }), {}),
      topStops: topStops.map((t) => ({
        stopId: t._id,
        stopName: sm[t._id.toString()]?.stopName || "Unknown",
        stopCode: sm[t._id.toString()]?.stopCode || "—",
        count: t.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════ */
/*  POST /api/heatmap/log — manual demand log from client         */
/* ═══════════════════════════════════════════════════════════════ */

exports.logDemandManual = async (req, res) => {
  try {
    const { stopId, source } = req.body;
    if (!stopId) return res.status(400).json({ success: false, message: "stopId required" });
    await exports.logDemand(stopId, source || "map_tap");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

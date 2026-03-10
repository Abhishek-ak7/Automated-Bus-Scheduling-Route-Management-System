const Route = require("../models/Route");
const Stop = require("../models/Stop");
const Trip = require("../models/Trip");
const Bus = require("../models/Bus");
const calculateETA = require("../utils/etaCalculator");
const { logDemand } = require("./heatmapController");

/* ──────────────────────────── helpers ──────────────────────────── */

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Sum `timeFromPrev` between two indices on a route */
function sumTime(stops, fromIdx, toIdx) {
  let t = 0;
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    t += stops[i].timeFromPrev || 3; // default 3 min per hop
  }
  return t;
}

/** Sum `distanceFromPrev` between two indices on a route */
function sumDist(stops, fromIdx, toIdx) {
  let d = 0;
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    d += stops[i].distanceFromPrev || 0;
  }
  return Math.round(d * 10) / 10;
}

/* ─────────────────── find live buses on a segment ──────────────── */

async function liveBusesForSegment(routeId, fromIdx) {
  const trips = await Trip.find({ route: routeId, status: "running" }).populate(
    "bus",
    "busNumber busType currentLocation"
  );

  const results = [];
  for (const trip of trips) {
    if (!trip.bus?.currentLocation?.lat) continue;
    const { lat, lng } = trip.bus.currentLocation;
    results.push({
      busId: trip.bus._id,
      busNumber: trip.bus.busNumber,
      busType: trip.bus.busType,
      tripId: trip._id,
      delay: trip.delayMinutes || 0,
      busLocation: { lat, lng },
    });
  }
  return results;
}

/* ═══════════════════════ MAIN CONTROLLER ════════════════════════ */

/**
 * POST /api/trip-planner/search
 * Body: { fromStopId, toStopId }
 *
 * Returns:
 *  - directRoutes   : routes that serve BOTH stops in order
 *  - transferRoutes  : pairs of routes connected by a common transfer stop
 */
exports.searchRoutes = async (req, res) => {
  try {
    const { fromStopId, toStopId } = req.body;
    if (!fromStopId || !toStopId)
      return res.status(400).json({ success: false, message: "fromStopId and toStopId are required" });

    if (fromStopId === toStopId)
      return res.status(400).json({ success: false, message: "Origin and destination cannot be the same" });

    /* ── load origin & destination stops ─────────────────────────── */
    const [fromStop, toStop] = await Promise.all([
      Stop.findById(fromStopId),
      Stop.findById(toStopId),
    ]);
    if (!fromStop || !toStop)
      return res.status(404).json({ success: false, message: "One or both stops not found" });
    /* log demand for both stops (fire-and-forget) */
    logDemand(fromStopId, 'trip_search');
    logDemand(toStopId, 'trip_search');
    /* ── load all active routes (populated) ──────────────────────── */
    const routes = await Route.find({ isActive: true }).populate(
      "stops.stopId",
      "stopName stopCode location"
    );

    /* ── 1. DIRECT routes ────────────────────────────────────────── */
    const directRoutes = [];

    for (const route of routes) {
      const fromIdx = route.stops.findIndex(
        (s) => s.stopId && s.stopId._id.toString() === fromStopId
      );
      const toIdx = route.stops.findIndex(
        (s) => s.stopId && s.stopId._id.toString() === toStopId
      );

      if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) continue;

      const totalStops = toIdx - fromIdx;
      const estTime = sumTime(route.stops, fromIdx, toIdx);
      const estDist = sumDist(route.stops, fromIdx, toIdx);
      const liveBuses = await liveBusesForSegment(route._id, fromIdx);

      // For each live bus, compute ETA to the origin stop
      const busesWithEta = liveBuses.map((b) => ({
        ...b,
        etaToOrigin: calculateETA(
          b.busLocation.lat,
          b.busLocation.lng,
          fromStop.location.lat,
          fromStop.location.lng,
          30
        ),
      }));

      directRoutes.push({
        type: "direct",
        routeId: route._id,
        routeName: route.routeName,
        routeCode: route.routeCode,
        routeType: route.routeType,
        fromStop: {
          _id: fromStop._id,
          stopName: fromStop.stopName,
          stopCode: fromStop.stopCode,
          sequence: route.stops[fromIdx].sequence,
        },
        toStop: {
          _id: toStop._id,
          stopName: toStop.stopName,
          stopCode: toStop.stopCode,
          sequence: route.stops[toIdx].sequence,
        },
        totalStops,
        estimatedTime: estTime,
        estimatedDistance: estDist,
        liveBuses: busesWithEta.sort((a, b) => a.etaToOrigin - b.etaToOrigin),
        // intermediate stops (for showing on a route detail)
        intermediateStops: route.stops.slice(fromIdx, toIdx + 1).map((s) => ({
          _id: s.stopId?._id,
          stopName: s.stopId?.stopName,
          stopCode: s.stopId?.stopCode,
          location: s.stopId?.location,
          sequence: s.sequence,
        })),
      });
    }

    directRoutes.sort((a, b) => a.estimatedTime - b.estimatedTime);

    /* ── 2. TRANSFER routes (1 transfer) ─────────────────────────── */
    const transferRoutes = [];

    // Build a map: stopId → [{ route, stopIndex }]
    const stopRouteMap = {};
    for (const route of routes) {
      route.stops.forEach((s, idx) => {
        if (!s.stopId) return;
        const sid = s.stopId._id.toString();
        if (!stopRouteMap[sid]) stopRouteMap[sid] = [];
        stopRouteMap[sid].push({ route, idx });
      });
    }

    // Routes that contain fromStop (with fromStop index)
    const routesFromOrigin = [];
    for (const route of routes) {
      const idx = route.stops.findIndex(
        (s) => s.stopId && s.stopId._id.toString() === fromStopId
      );
      if (idx !== -1) routesFromOrigin.push({ route, fromIdx: idx });
    }

    // Routes that contain toStop (with toStop index)
    const routesToDest = [];
    for (const route of routes) {
      const idx = route.stops.findIndex(
        (s) => s.stopId && s.stopId._id.toString() === toStopId
      );
      if (idx !== -1) routesToDest.push({ route, toIdx: idx });
    }

    // Find common transfer stops
    const seen = new Set(); // dedup
    for (const { route: r1, fromIdx } of routesFromOrigin) {
      // Stops AFTER origin on route 1
      for (let i = fromIdx + 1; i < r1.stops.length; i++) {
        const transferStopId = r1.stops[i].stopId?._id.toString();
        if (!transferStopId) continue;

        // Is this stop also on any route leading to the destination?
        for (const { route: r2, toIdx } of routesToDest) {
          if (r1._id.toString() === r2._id.toString()) continue; // skip same route (already in direct)

          const tIdx2 = r2.stops.findIndex(
            (s) => s.stopId && s.stopId._id.toString() === transferStopId
          );
          if (tIdx2 === -1 || tIdx2 >= toIdx) continue; // transfer must come before destination

          const key = `${r1._id}-${r2._id}-${transferStopId}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const leg1Time = sumTime(r1.stops, fromIdx, i);
          const leg2Time = sumTime(r2.stops, tIdx2, toIdx);
          const transferWait = 5; // assumed 5 min transfer
          const totalTime = leg1Time + transferWait + leg2Time;

          const leg1Dist = sumDist(r1.stops, fromIdx, i);
          const leg2Dist = sumDist(r2.stops, tIdx2, toIdx);

          const tStop = r1.stops[i].stopId;

          transferRoutes.push({
            type: "transfer",
            totalTime,
            transferStop: {
              _id: tStop._id,
              stopName: tStop.stopName,
              stopCode: tStop.stopCode,
              location: tStop.location,
            },
            legs: [
              {
                routeId: r1._id,
                routeName: r1.routeName,
                routeCode: r1.routeCode,
                routeType: r1.routeType,
                from: {
                  _id: fromStop._id,
                  stopName: fromStop.stopName,
                  stopCode: fromStop.stopCode,
                },
                to: {
                  _id: tStop._id,
                  stopName: tStop.stopName,
                  stopCode: tStop.stopCode,
                },
                stops: i - fromIdx,
                estimatedTime: leg1Time,
                estimatedDistance: leg1Dist,
              },
              {
                routeId: r2._id,
                routeName: r2.routeName,
                routeCode: r2.routeCode,
                routeType: r2.routeType,
                from: {
                  _id: tStop._id,
                  stopName: tStop.stopName,
                  stopCode: tStop.stopCode,
                },
                to: {
                  _id: toStop._id,
                  stopName: toStop.stopName,
                  stopCode: toStop.stopCode,
                },
                stops: toIdx - tIdx2,
                estimatedTime: leg2Time,
                estimatedDistance: leg2Dist,
              },
            ],
          });
        }
      }
    }

    transferRoutes.sort((a, b) => a.totalTime - b.totalTime);

    /* ── Response ─────────────────────────────────────────────────── */
    res.json({
      success: true,
      origin: { _id: fromStop._id, stopName: fromStop.stopName, stopCode: fromStop.stopCode, location: fromStop.location },
      destination: { _id: toStop._id, stopName: toStop.stopName, stopCode: toStop.stopCode, location: toStop.location },
      directRoutes: {
        count: directRoutes.length,
        data: directRoutes,
      },
      transferRoutes: {
        count: Math.min(transferRoutes.length, 10), // cap at 10
        data: transferRoutes.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("Trip planner error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/trip-planner/stops
 * Returns a lightweight list of all active stops (for the autocomplete dropdowns)
 */
exports.getStopsForPlanner = async (_req, res) => {
  try {
    const stops = await Stop.find({ isActive: true })
      .select("stopName stopCode location")
      .sort("stopName")
      .lean();
    res.json({ success: true, count: stops.length, data: stops });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

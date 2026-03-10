const Stop = require('../models/Stop');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const calculateETA = require('../utils/etaCalculator');
const findNextStop = require('../utils/findNextStop');
const { logDemand } = require('./heatmapController');

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

/* GET arrivals for a stop (public) */
exports.getArrivals = async (req, res) => {
  try {
    const stopId = req.params.id;

    /* log demand signal (fire-and-forget) */
    logDemand(stopId, 'arrival_check');

    const stop = await Stop.findById(stopId);
    if (!stop) {
      return res.status(404).json({ success: false, message: 'Stop not found' });
    }

    /* find all running trips */
    const runningTrips = await Trip.find({ status: 'running' })
      .populate('bus')
      .populate('route');

    const arrivals = [];

    for (const trip of runningTrips) {
      if (!trip.bus || !trip.route) continue;

      const route = await Route.findById(trip.route._id)
        .populate('stops.stopId');
      if (!route) continue;

      /* check if this stop is on this route */
      const stopIndex = route.stops.findIndex(
        (s) => s.stopId && s.stopId._id.toString() === stopId
      );
      if (stopIndex === -1) continue;

      const busLoc = trip.bus.currentLocation;
      if (!busLoc || !busLoc.lat || !busLoc.lng) continue;

      /* check bus hasn't already passed this stop */
      const result = findNextStop(busLoc.lat, busLoc.lng, route.stops, null, null);
      if (!result || result.index > stopIndex) continue;

      const eta = calculateETA(
        busLoc.lat, busLoc.lng,
        stop.location.lat, stop.location.lng,
        30
      );

      arrivals.push({
        busId: trip.bus._id,
        busNumber: trip.bus.busNumber,
        busType: trip.bus.busType,
        routeName: route.routeName,
        routeCode: route.routeCode,
        eta,
        tripId: trip._id,
        delay: trip.delayMinutes || 0,
        busLocation: { lat: busLoc.lat, lng: busLoc.lng }
      });
    }

    arrivals.sort((a, b) => a.eta - b.eta);

    res.json({
      success: true,
      stop: { _id: stop._id, stopName: stop.stopName, stopCode: stop.stopCode },
      count: arrivals.length,
      arrivals
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET arrivals for MULTIPLE stops at once (public) */
exports.getMultiStopArrivals = async (req, res) => {
  try {
    const { stopIds } = req.query;
    if (!stopIds)
      return res.status(400).json({ success: false, message: 'stopIds query param required (comma-separated)' });

    const ids = stopIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0)
      return res.json({ success: true, data: [] });

    const stopsMap = {};
    for (const id of ids) {
      const stop = await Stop.findById(id);
      if (stop) stopsMap[id] = stop;
    }

    const runningTrips = await Trip.find({ status: 'running' })
      .populate('bus')
      .populate('route');

    const results = [];

    for (const trip of runningTrips) {
      if (!trip.bus || !trip.route) continue;

      const route = await Route.findById(trip.route._id).populate('stops.stopId');
      if (!route) continue;

      const busLoc = trip.bus.currentLocation;
      if (!busLoc || !busLoc.lat || !busLoc.lng) continue;

      const nextResult = findNextStop(busLoc.lat, busLoc.lng, route.stops, null, null);

      for (const id of ids) {
        const stop = stopsMap[id];
        if (!stop) continue;

        const stopIndex = route.stops.findIndex(
          (s) => s.stopId && s.stopId._id.toString() === id
        );
        if (stopIndex === -1) continue;
        if (!nextResult || nextResult.index > stopIndex) continue;

        const eta = calculateETA(
          busLoc.lat, busLoc.lng,
          stop.location.lat, stop.location.lng,
          30
        );

        results.push({
          stopId: id,
          stopName: stop.stopName,
          stopCode: stop.stopCode,
          busId: trip.bus._id,
          busNumber: trip.bus.busNumber,
          busType: trip.bus.busType,
          routeName: route.routeName,
          routeCode: route.routeCode,
          eta,
          tripId: trip._id,
          delay: trip.delayMinutes || 0,
          busLocation: { lat: busLoc.lat, lng: busLoc.lng },
        });
      }
    }

    results.sort((a, b) => a.eta - b.eta);

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET nearby stops (public) — Haversine distance */
exports.getNearbyStops = async (req, res) => {
  try {
    const { lat, lng, radius = 2, limit = 10 } = req.query;
    if (!lat || !lng)
      return res.status(400).json({ success: false, message: 'lat and lng are required' });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxKm = parseFloat(radius);

    const allStops = await Stop.find({ isActive: true }).populate('routes');

    /* Haversine formula */
    const toRad = (d) => (d * Math.PI) / 180;
    const haversine = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const nearby = allStops
      .map((s) => ({
        _id: s._id,
        stopName: s.stopName,
        stopCode: s.stopCode,
        location: s.location,
        facilities: s.facilities,
        routes: (s.routes || []).map((r) => ({
          _id: r._id,
          routeName: r.routeName,
          routeCode: r.routeCode,
        })),
        distance: haversine(userLat, userLng, s.location.lat, s.location.lng),
      }))
      .filter((s) => s.distance <= maxKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit));

    res.json({ success: true, count: nearby.length, data: nearby });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

const Stop = require('../models/Stop');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const calculateETA = require('../utils/etaCalculator');
const findNextStop = require('../utils/findNextStop');

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

/* DELETE (soft delete) */
exports.deleteStop = async (req, res) => {
  try {
    await Stop.findByIdAndUpdate(req.params.id, { isActive:false });
    res.json({ success:true, message:"Stop deactivated" });
  } catch (err) {
    res.status(500).json({ success:false, message: err.message });
  }
};

const Trip = require("../models/Trip");
const Route = require("../models/Route");
const Bus = require("../models/Bus");
const calculateETA = require("../utils/etaCalculator");

exports.detectStopArrival = async (tripId, lat, lng) => {

  const trip = await Trip.findById(tripId);

  if (!trip) return null;

  const route = await Route.findById(trip.route)
    .populate("stops.stopId");

  if (!route) return null;

  for (let stop of route.stops) {

    const stopLat = stop.stopId.location.lat;
    const stopLng = stop.stopId.location.lng;

    const distance =
      Math.abs(stopLat - lat) +
      Math.abs(stopLng - lng);

    /* tolerance radius */
    if (distance < 0.002) {

      return {
        stopId: stop.stopId._id,
        stopName: stop.stopId.stopName
      };

    }

  }

  return null;

};

/* ═══════════════════════════════════════════════════
   GET /api/trips/active/:busId/progress
   Returns full route-progress data for a running trip
   ═══════════════════════════════════════════════════ */
exports.getTripProgress = async (req, res) => {
  try {
    const { busId } = req.params;

    /* find the running trip for this bus */
    const trip = await Trip.findOne({ bus: busId, status: "running" })
      .populate("bus", "busNumber busType currentLocation")
      .populate("route")
      .populate("schedule", "startTime endTime");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "No active trip for this bus",
      });
    }

    /* populate the route stops */
    const route = await Route.findById(trip.route._id || trip.route)
      .populate("stops.stopId", "stopName stopCode location");

    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    /* bus current location */
    const bus = await Bus.findById(busId);
    const busLat = bus?.currentLocation?.lat;
    const busLng = bus?.currentLocation?.lng;

    /* build stop list with ETA per stop */
    const stops = route.stops.map((s, idx) => {
      let eta = null;
      if (busLat && busLng && s.stopId?.location) {
        eta = calculateETA(
          busLat,
          busLng,
          s.stopId.location.lat,
          s.stopId.location.lng,
          30
        );
      }
      return {
        _id: s.stopId?._id,
        stopName: s.stopId?.stopName,
        stopCode: s.stopId?.stopCode,
        location: s.stopId?.location,
        sequence: s.sequence,
        distanceFromPrev: s.distanceFromPrev,
        timeFromPrev: s.timeFromPrev,
        eta,
      };
    });

    res.json({
      success: true,
      data: {
        tripId: trip._id,
        status: trip.status,
        busId: bus._id,
        busNumber: bus.busNumber,
        busType: bus.busType,
        busLocation: bus.currentLocation,
        routeName: route.routeName,
        routeCode: route.routeCode,
        routeType: route.routeType,
        totalDistance: route.totalDistance,
        estimatedDuration: route.estimatedDuration,
        delayMinutes: trip.delayMinutes,
        actualStartTime: trip.actualStartTime,
        plannedStartTime: trip.plannedStartTime,
        stops,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════
   GET /api/trips/active   — list all running trips
   ═══════════════════════════════════════════════════ */
exports.getActiveTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ status: "running" })
      .populate("bus", "busNumber busType currentLocation")
      .populate("route", "routeName routeCode stops")
      .sort({ actualStartTime: -1 });

    res.json({ success: true, count: trips.length, data: trips });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Trip = require("../models/Trip");
const Route = require("../models/Route");

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

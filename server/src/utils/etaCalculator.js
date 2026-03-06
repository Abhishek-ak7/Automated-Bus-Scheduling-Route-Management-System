/* Haversine distance calculation */

function getDistance(lat1, lng1, lat2, lng2) {

  const R = 6371; // earth radius km

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // distance in km
}

/* ETA calculation */

function calculateETA(busLat, busLng, stopLat, stopLng, speed = 30) {

  const distance = getDistance(busLat, busLng, stopLat, stopLng);

  const timeHours = distance / speed;

  const minutes = timeHours * 60;

  return Math.round(minutes);
}

module.exports = calculateETA;

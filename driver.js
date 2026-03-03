const io = require("socket.io-client");

const socket = io("http://localhost:5000");

/* Your REAL bus id */
const BUS_ID = "69a5a4d560cdc5a028508cc4";

/* START: LPU */
let lat = 31.2536;
let lng = 75.7050;

/* TARGET: Jalandhar */
const targetLat = 31.3260;
const targetLng = 75.5762;

socket.on("connect", () => {
  console.log("Driver connected to server");

  socket.emit("registerBus", BUS_ID);

  const interval = setInterval(() => {

    /* move gradually toward target */
    lat += (targetLat - lat) * 0.05;
    lng += (targetLng - lng) * 0.05;

    socket.emit("locationUpdate", {
      busId: BUS_ID,
      lat,
      lng
    });

    console.log("Moving bus:", lat.toFixed(6), lng.toFixed(6));

    /* check if reached destination */
    const dist = Math.abs(lat - targetLat) + Math.abs(lng - targetLng);

    if (dist < 0.0005) {
      console.log("Bus reached destination stop");
      clearInterval(interval);
    }

  }, 3000);
});
require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");

const Trip = require("./src/models/Trip");
const Route = require("./src/models/Route");

const calculateETA = require("./src/utils/etaCalculator");

const { updateLocation } = require("./src/controllers/busController");
const { detectStopArrival } = require("./src/controllers/tripController");

const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

/* SOCKET.IO */
const io = new Server(server, {
  cors: { origin: "*" }
});

/* in-memory stores */
const activeTrips = {};
const lastLocations = {};
const lastStopDetected = {};

io.on("connection", (socket) => {

  console.log("Driver connected:", socket.id);

  /* register bus */
  socket.on("registerBus", (busId) => {
    console.log("Bus registered:", busId);
  });

  /* location update */
  socket.on("locationUpdate", async (data) => {

    try {

      const { busId, lat, lng } = data;

      /* 1️⃣ Save location */
      await updateLocation(busId, lat, lng);

      /* 2️⃣ Detect movement */
      let moved = false;

      if (lastLocations[busId]) {

        const prev = lastLocations[busId];

        const distance =
          Math.abs(prev.lat - lat) +
          Math.abs(prev.lng - lng);

        if (distance > 0.0002) moved = true;

      }

      lastLocations[busId] = { lat, lng };

      /* 3️⃣ Start trip automatically */
      const trip = await Trip.findOne({
        bus: busId,
        status: "scheduled"
      }).sort({ plannedStartTime: 1 });

      if (trip && moved && !activeTrips[busId]) {

        trip.status = "running";
        trip.actualStartTime = new Date();

        const planned = new Date(trip.plannedStartTime);
        const actual = new Date();

        let delay = (actual - planned) / 60000;

        if (delay < 0) delay = 0;
        if (delay > 120) delay = 0;

        trip.delayMinutes = Math.round(delay);

        await trip.save();

        activeTrips[busId] = trip._id;

        console.log("🚍 Trip started! Delay:", trip.delayMinutes, "minutes");
      }

      /* 4️⃣ Stop arrival detection */
      if (activeTrips[busId]) {

        const arrival = await detectStopArrival(
          activeTrips[busId],
          lat,
          lng
        );

        if (
          arrival &&
          lastStopDetected[busId] !== arrival.stopId.toString()
        ) {

          lastStopDetected[busId] = arrival.stopId.toString();

          console.log("📍 Bus reached stop:", arrival.stopName);

          io.emit("bus:stop:arrival", {
            busId,
            stopId: arrival.stopId,
            stopName: arrival.stopName
          });

        }
      }

      /* 5️⃣ ETA calculation */
      let eta = null;

      if (activeTrips[busId]) {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip) {

          const route = await Route.findById(runningTrip.route)
            .populate("stops.stopId");

          if (route && route.stops.length > 0) {

            const nextStop = route.stops[0].stopId;

            eta = calculateETA(
              lat,
              lng,
              nextStop.location.lat,
              nextStop.location.lng,
              30
            );

          }

        }

      }

      /* 6️⃣ Trip completion detection */
      if (activeTrips[busId]) {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip) {

          const route = await Route.findById(runningTrip.route)
            .populate("stops.stopId");

          if (route && route.stops.length > 1) {

            const lastStop =
              route.stops[route.stops.length - 1].stopId;

            const stopLat = lastStop.location.lat;
            const stopLng = lastStop.location.lng;

            const dist =
              Math.abs(stopLat - lat) +
              Math.abs(stopLng - lng);

            if (dist < 0.05) {

              runningTrip.status = "completed";
              runningTrip.actualEndTime = new Date();

              const duration =
                (runningTrip.actualEndTime -
                  runningTrip.actualStartTime) / 60000;

              runningTrip.travelMinutes =
                Math.round(duration);

              await runningTrip.save();

              console.log(
                "🏁 Trip completed! Travel time:",
                runningTrip.travelMinutes,
                "minutes"
              );

              io.emit("trip:completed", {
                busId,
                tripId: runningTrip._id,
                delay: runningTrip.delayMinutes,
                travelMinutes: runningTrip.travelMinutes
              });

              delete activeTrips[busId];
              delete lastStopDetected[busId];

            }

          }

        }

      }

      /* 7️⃣ Broadcast location + ETA */

      io.emit("bus:location:update", {
        busId,
        lat,
        lng,
        eta
      });

    } catch (err) {

      console.log("Socket error:", err.message);

    }

  });

  /* driver manual trip completion */

  socket.on("tripComplete", async (data) => {

    const { busId, lat, lng } = data;

    console.log("🏁 Driver manually completed trip");

    if (activeTrips[busId]) {

      try {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip && runningTrip.status === "running") {

          runningTrip.status = "completed";
          runningTrip.actualEndTime = new Date();

          const duration =
            (runningTrip.actualEndTime -
              runningTrip.actualStartTime) / 60000;

          runningTrip.travelMinutes =
            Math.round(duration);

          await runningTrip.save();

          io.emit("trip:completed", {
            busId,
            tripId: runningTrip._id,
            delay: runningTrip.delayMinutes,
            travelMinutes: runningTrip.travelMinutes
          });

        }

      } catch (err) {

        console.log("Trip completion error:", err.message);

      }

      delete activeTrips[busId];
      delete lastStopDetected[busId];

    }

    delete lastLocations[busId];

  });

  socket.on("disconnect", () => {
    console.log("Driver disconnected:", socket.id);
  });

});

/* start server */

connectDB().then(() => {

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

});
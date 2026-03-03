require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/db');

const Trip = require('./src/models/Trip');
const Route = require('./src/models/Route');
const { updateLocation } = require('./src/controllers/busController');

const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

/* SOCKET IO */
const io = new Server(server, {
  cors: { origin: "*" }
});

/* memory stores */
const activeTrips = {};
const lastLocations = {};

io.on('connection', (socket) => {
  console.log("Driver connected:", socket.id);

  socket.on('registerBus', (busId) => {
    console.log("Bus registered:", busId);
  });

  socket.on('locationUpdate', async (data) => {
    try {
      const { busId, lat, lng } = data;

      /* 1️⃣ Save location */
      await updateLocation(busId, lat, lng);

      /* 2️⃣ Detect movement */
      let moved = false;

      if (lastLocations[busId]) {
        const prev = lastLocations[busId];
        const distance =
          Math.abs(prev.lat - lat) + Math.abs(prev.lng - lng);

        if (distance > 0.0002) moved = true;
      }

      lastLocations[busId] = { lat, lng };

      /* 3️⃣ Start trip */
      const trip = await Trip.findOne({
        bus: busId,
        status: 'scheduled'
      }).sort({ plannedStartTime: 1 });

      if (trip && moved && !activeTrips[busId]) {

        trip.status = 'running';
        trip.actualStartTime = new Date();

        const delay =
          (trip.actualStartTime - trip.plannedStartTime) / 60000;

        trip.delayMinutes = Math.max(0, Math.round(delay));

        await trip.save();

        activeTrips[busId] = trip._id;

        console.log("🚍 Trip started! Delay:", trip.delayMinutes, "minutes");
      }

      /* 4️⃣ Completion detection */
      if (activeTrips[busId]) {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip) {

          const route = await Route.findById(runningTrip.route)
            .populate('stops.stopId');

          if (route && route.stops.length > 1) {

            const lastStop =
              route.stops[route.stops.length - 1].stopId;

            const stopLat = lastStop.location.lat;
            const stopLng = lastStop.location.lng;

            const dist =
              Math.abs(stopLat - lat) +
              Math.abs(stopLng - lng);

            /* increased tolerance */
            if (dist < 0.003) {

              runningTrip.status = 'completed';
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

              delete activeTrips[busId];
            }
          }
        }
      }

    io.emit("bus:location:update", data);

    } catch (err) {
      console.log("Socket error:", err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log("Driver disconnected");
  });
});

/* start server */
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
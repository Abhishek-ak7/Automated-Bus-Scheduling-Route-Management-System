require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./src/config/db");

const Trip = require("./src/models/Trip");
const Route = require("./src/models/Route");
const Bus = require("./src/models/Bus");

const calculateETA = require("./src/utils/etaCalculator");
const findNextStop = require("./src/utils/findNextStop");

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
const busStopIndex = {};          /* tracks each bus's last-visited stop index on its route */
const lastDelayAlerted = {};      /* tracks last delay alert sent per busId to avoid spam */

io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  /* ── Passenger: watch a stop for live arrivals ── */
  socket.on("watchStop", (stopId) => {
    socket.join(`stop:${stopId}`);
    console.log("👁️  Watching stop:", stopId);
  });

  socket.on("unwatchStop", (stopId) => {
    socket.leave(`stop:${stopId}`);
  });

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

          /* resolve the index of the arrived stop in the route */
          const runningTrip = await Trip.findById(activeTrips[busId]);
          if (runningTrip) {
            const route = await Route.findById(runningTrip.route)
              .populate("stops.stopId");
            if (route) {
              const idx = route.stops.findIndex(
                (s) => s.stopId._id.toString() === arrival.stopId.toString()
              );
              if (idx !== -1) busStopIndex[busId] = idx;
            }
          }

          console.log(
            "📍 Bus reached stop:",
            arrival.stopName,
            "(index", busStopIndex[busId] ?? "?", ")"
          );

          io.emit("bus:stop:arrival", {
            busId,
            stopId: arrival.stopId,
            stopName: arrival.stopName
          });

        }
      }

      /* 5️⃣ ETA calculation */
      let eta = null;
      let nextStopName = null;

      if (activeTrips[busId]) {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip) {

          const route = await Route.findById(runningTrip.route)
            .populate("stops.stopId");

          if (route && route.stops.length > 0) {

            const lastIdx = busStopIndex[busId] ?? null;
            const prevLoc = lastLocations[busId] ?? null;

            const result = findNextStop(
              lat,
              lng,
              route.stops,
              lastIdx,
              prevLoc
            );

            if (result) {
              eta = calculateETA(
                lat,
                lng,
                result.stop.location.lat,
                result.stop.location.lng,
                30
              );
              nextStopName = result.stop.stopName;
              console.log("🎯 Next stop:", nextStopName, "| idx:", result.index, "| ETA:", eta, "min | lastVisited:", lastIdx);
            }
          }

        }

      }

      /* 5️⃣½ Broadcast arrival board updates to stop watchers */
      if (activeTrips[busId]) {

        const runningTrip = await Trip.findById(activeTrips[busId]);

        if (runningTrip) {

          const route = await Route.findById(runningTrip.route)
            .populate("stops.stopId");

          const bus = await Bus.findById(busId);

          if (route && bus) {

            const lastIdx = busStopIndex[busId] ?? null;
            const startIdx = lastIdx !== null ? lastIdx + 1 : 0;

            for (let i = startIdx; i < route.stops.length; i++) {
              const s = route.stops[i];
              if (!s.stopId) continue;

              const sid = s.stopId._id.toString();

              const stopETA = calculateETA(
                lat, lng,
                s.stopId.location.lat,
                s.stopId.location.lng,
                30
              );

              io.to(`stop:${sid}`).emit("stop:eta:update", {
                stopId: sid,
                busId,
                busNumber: bus.busNumber,
                busType: bus.busType,
                routeName: route.routeName,
                routeCode: route.routeCode,
                eta: stopETA,
                delay: runningTrip.delayMinutes || 0,
                busLocation: { lat, lng }
              });

              /* ── 5️⃣¾ Delay Alert to stop watchers ── */
              const delayMin = runningTrip.delayMinutes || 0;
              const DELAY_THRESHOLD = 3; /* minutes – alert when ≥ 3 min late */
              const alertKey = `${busId}:${sid}`;
              const lastAlert = lastDelayAlerted[alertKey] || 0;
              const now = Date.now();

              /* send alert once per bus-stop combo every 60 seconds max */
              if (delayMin >= DELAY_THRESHOLD && now - lastAlert > 60000) {
                const arrivalTime = new Date(Date.now() + stopETA * 60000);

                io.to(`stop:${sid}`).emit("bus:delay:alert", {
                  stopId: sid,
                  busId,
                  busNumber: bus.busNumber,
                  busType: bus.busType,
                  routeName: route.routeName,
                  routeCode: route.routeCode,
                  delayMinutes: delayMin,
                  eta: stopETA,
                  estimatedArrival: arrivalTime.toISOString(),
                  estimatedArrivalFormatted: arrivalTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  severity: delayMin >= 15 ? "critical" : delayMin >= 8 ? "high" : "moderate",
                  message: `Bus ${bus.busNumber} (${route.routeCode}) is delayed by ${delayMin} min`,
                });

                lastDelayAlerted[alertKey] = now;
                console.log(`⚠️  Delay alert → stop ${sid}: Bus ${bus.busNumber} +${delayMin} min`);
              }
            }
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

              runningTrip.travelMinutes = Math.max(1, Math.round(duration));

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
              delete busStopIndex[busId];
              /* clear delay alert throttle for this bus */
              Object.keys(lastDelayAlerted).forEach((k) => {
                if (k.startsWith(busId + ":")) delete lastDelayAlerted[k];
              });

            }

          }

        }

      }

      /* 7️⃣ Broadcast location + ETA + route progress */

      let progressPayload = null;

      if (activeTrips[busId]) {
        const runningTrip = await Trip.findById(activeTrips[busId]);
        if (runningTrip) {
          const route = await Route.findById(runningTrip.route)
            .populate("stops.stopId");
          const busDoc = await Bus.findById(busId);

          if (route && route.stops.length > 0) {
            const currentIdx = busStopIndex[busId] ?? -1;
            const totalStops = route.stops.length;

            /* % completion: ratio of visited stops to total segments */
            const completionPct =
              totalStops <= 1
                ? 0
                : Math.min(100, Math.round(((currentIdx + 1) / (totalStops - 1)) * 100));

            /* build compact stop list with per-stop ETAs */
            const stopsProgress = route.stops.map((s, idx) => {
              let stopEta = null;
              if (s.stopId?.location) {
                stopEta = calculateETA(lat, lng, s.stopId.location.lat, s.stopId.location.lng, 30);
              }
              return {
                _id: s.stopId?._id,
                stopName: s.stopId?.stopName,
                stopCode: s.stopId?.stopCode,
                sequence: s.sequence,
                eta: stopEta,
                status:
                  idx < currentIdx + 1
                    ? "visited"
                    : idx === currentIdx + 1
                    ? "next"
                    : "upcoming",
              };
            });

            progressPayload = {
              tripId: runningTrip._id,
              routeId: route._id,
              routeName: route.routeName,
              routeCode: route.routeCode,
              routeType: route.routeType,
              busNumber: busDoc?.busNumber,
              busType: busDoc?.busType,
              delayMinutes: runningTrip.delayMinutes || 0,
              actualStartTime: runningTrip.actualStartTime,
              currentStopIndex: currentIdx,
              totalStops,
              completionPct,
              stops: stopsProgress,
            };
          }
        }
      }

      /* Resolve routeId even when there's no progress (trip just started) */
      let broadcastRouteId = progressPayload?.routeId || null;
      if (!broadcastRouteId && activeTrips[busId]) {
        const t = await Trip.findById(activeTrips[busId]);
        if (t) broadcastRouteId = t.route;
      }

      io.emit("bus:location:update", {
  busId,
  lat,
  lng,
  routeId: broadcastRouteId,
  eta,
  nextStop: nextStopName,
  progress: progressPayload,
  delay: progressPayload?.delayMinutes || 0
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
      delete busStopIndex[busId];

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
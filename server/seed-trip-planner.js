/**
 * ──────────────────────────────────────────────────────
 *  TRIP-PLANNER TEST SEED
 * ──────────────────────────────────────────────────────
 *  Creates 10 stops, 3 overlapping routes, 5 buses,
 *  5 schedules and 5 scheduled trips so the Trip Planner
 *  (and the 5-bus simulator) can work end-to-end.
 *
 *  Run:  node seed-trip-planner.js
 * ──────────────────────────────────────────────────────
 */

const mongoose = require("mongoose");
require("dotenv").config();

/* models */
require("./src/models/Stop");
require("./src/models/Route");
require("./src/models/Bus");
require("./src/models/Schedule");
require("./src/models/Trip");

const Stop = mongoose.model("Stop");
const Route = mongoose.model("Route");
const Bus = mongoose.model("Bus");
const Schedule = mongoose.model("Schedule");
const Trip = mongoose.model("Trip");

/* ── stop data ──────────────────────────────────────── */
const STOPS = [
  { stopName: "LPU Main Gate",       stopCode: "LPU01",  lat: 31.2536, lng: 75.7050 },
  { stopName: "Phagwara Bypass",     stopCode: "PHG",     lat: 31.2717, lng: 75.6728 },
  { stopName: "Nakodar Chowk",       stopCode: "NKD",     lat: 31.2898, lng: 75.6406 },
  { stopName: "Kartarpur Turn",      stopCode: "KRT",     lat: 31.3079, lng: 75.6084 },
  { stopName: "Jalandhar Bus Stand", stopCode: "JAL01",   lat: 31.3260, lng: 75.5762 },
  { stopName: "Goraya Chowk",        stopCode: "GRY",     lat: 31.2780, lng: 75.6350 },
  { stopName: "Kapurthala Gate",     stopCode: "KPT",     lat: 31.3050, lng: 75.5450 },
  { stopName: "Adampur Bypass",      stopCode: "ADP",     lat: 31.2870, lng: 75.5700 },
  { stopName: "Bhogpur Turn",        stopCode: "BHP",     lat: 31.3150, lng: 75.5900 },
  { stopName: "Lambra Stop",         stopCode: "LMB",     lat: 31.2650, lng: 75.6900 },
];

/* ── route definitions (refer to STOPS by stopCode) ── */
const ROUTES = [
  {
    routeName: "LPU → Jalandhar (via Phagwara-Nakodar)",
    routeCode: "R200",
    routeType: "local",
    totalDistance: 16,
    estimatedDuration: 25,
    stops: ["LPU01", "PHG", "NKD", "KRT", "JAL01"],
  },
  {
    routeName: "Jalandhar → LPU (via Goraya)",
    routeCode: "R301",
    routeType: "express",
    totalDistance: 18,
    estimatedDuration: 22,
    stops: ["JAL01", "BHP", "KRT", "GRY", "LMB", "LPU01"],
  },
  {
    routeName: "Jalandhar → LPU (via Kapurthala-Adampur)",
    routeCode: "R402",
    routeType: "local",
    totalDistance: 20,
    estimatedDuration: 30,
    stops: ["JAL01", "KPT", "ADP", "NKD", "PHG", "LPU01"],
  },
];

/* ── bus fleet ──────────────────────────────────────── */
const BUSES = [
  { busNumber: "DL-1P-0501", busType: "AC",       routeCode: "R200" },
  { busNumber: "DL-1P-0502", busType: "NON-AC",   routeCode: "R200" },
  { busNumber: "DL-1P-0601", busType: "ELECTRIC",  routeCode: "R301" },
  { busNumber: "DL-1P-0602", busType: "AC",        routeCode: "R301" },
  { busNumber: "DL-1P-0701", busType: "NON-AC",   routeCode: "R402" },
];

/* ═════════════════════════════════════════════════════ */

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  /* 1 ── Upsert stops ─────────────────────────────── */
  const stopMap = {}; // stopCode → ObjectId
  for (const s of STOPS) {
    const doc = await Stop.findOneAndUpdate(
      { stopCode: s.stopCode },
      {
        stopName: s.stopName,
        stopCode: s.stopCode,
        location: { lat: s.lat, lng: s.lng },
        isActive: true,
      },
      { upsert: true, new: true }
    );
    stopMap[s.stopCode] = doc._id;
    console.log(`  Stop  ${s.stopCode.padEnd(6)} → ${doc._id}`);
  }

  /* 2 ── Upsert routes ────────────────────────────── */
  const routeMap = {}; // routeCode → ObjectId
  for (const r of ROUTES) {
    const stops = r.stops.map((code, i) => ({
      stopId: stopMap[code],
      sequence: i + 1,
      distanceFromPrev: i === 0 ? 0 : Math.round((r.totalDistance / (r.stops.length - 1)) * 10) / 10,
      timeFromPrev: i === 0 ? 0 : Math.round(r.estimatedDuration / (r.stops.length - 1)),
    }));

    const doc = await Route.findOneAndUpdate(
      { routeCode: r.routeCode },
      {
        routeName: r.routeName,
        routeCode: r.routeCode,
        routeType: r.routeType,
        totalDistance: r.totalDistance,
        estimatedDuration: r.estimatedDuration,
        isActive: true,
        stops,
      },
      { upsert: true, new: true }
    );
    routeMap[r.routeCode] = doc._id;
    console.log(`  Route ${r.routeCode.padEnd(6)} → ${doc._id}  (${r.stops.length} stops)`);

    /* also add route ref to each stop */
    for (const code of r.stops) {
      await Stop.findByIdAndUpdate(stopMap[code], { $addToSet: { routes: doc._id } });
    }
  }

  /* 3 ── Upsert buses ─────────────────────────────── */
  const busIds = [];
  for (const b of BUSES) {
    const doc = await Bus.findOneAndUpdate(
      { busNumber: b.busNumber },
      {
        busNumber: b.busNumber,
        busType: b.busType,
        capacity: 40,
        assignedRoute: routeMap[b.routeCode],
        status: "active",
        currentLocation: { lat: 0, lng: 0, lastUpdated: new Date() },
      },
      { upsert: true, new: true }
    );
    busIds.push({ id: doc._id, routeCode: b.routeCode, busNumber: b.busNumber });
    console.log(`  Bus   ${b.busNumber.padEnd(12)} → ${doc._id}  (${b.routeCode})`);
  }

  /* 4 ── Upsert schedules ─────────────────────────── */
  const scheduleMap = {}; // busId string → scheduleId
  for (const b of busIds) {
    const doc = await Schedule.findOneAndUpdate(
      { bus: b.id, route: routeMap[b.routeCode] },
      {
        route: routeMap[b.routeCode],
        bus: b.id,
        startTime: "06:00",
        endTime: "22:00",
        frequency: 30,
        daysOfOperation: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        isActive: true,
      },
      { upsert: true, new: true }
    );
    scheduleMap[b.id.toString()] = doc._id;
    console.log(`  Sched ${b.busNumber.padEnd(12)} → ${doc._id}`);
  }

  /* 5 ── Cancel old trips & create new SCHEDULED trips */
  for (const b of busIds) {
    await Trip.updateMany(
      { bus: b.id, status: { $in: ["running", "scheduled"] } },
      { status: "cancelled" }
    );

    const planned = new Date(Date.now() + 1 * 60_000); // starts in 1 min
    const trip = await Trip.create({
      schedule: scheduleMap[b.id.toString()],
      route: routeMap[b.routeCode],
      bus: b.id,
      plannedStartTime: planned,
      status: "scheduled",
    });
    console.log(`  Trip  ${b.busNumber.padEnd(12)} → ${trip._id}  (start ${planned.toLocaleTimeString()})`);
  }

  console.log("\n✅  Seed complete!  Now run:");
  console.log("    1. npm run dev          (start server)");
  console.log("    2. node simulate-buses.js  (start 5-bus simulator)\n");

  /* print a quick summary table for Trip Planner testing */
  console.log("┌───────────────────────────────────────────────────────────┐");
  console.log("│  Try these Trip Planner searches:                        │");
  console.log("│                                                          │");
  console.log("│  FROM: LPU Main Gate      → TO: Jalandhar Bus Stand     │");
  console.log("│        (Direct: R200  |  Transfer: R402→R301 etc.)      │");
  console.log("│                                                          │");
  console.log("│  FROM: Jalandhar Bus Stand → TO: LPU Main Gate          │");
  console.log("│        (Direct: R301, R402)                              │");
  console.log("│                                                          │");
  console.log("│  FROM: Phagwara Bypass     → TO: Kartarpur Turn         │");
  console.log("│        (Direct: R200 | Transfer via R402)               │");
  console.log("│                                                          │");
  console.log("│  FROM: Kapurthala Gate     → TO: LPU Main Gate          │");
  console.log("│        (Direct: R402)                                    │");
  console.log("└───────────────────────────────────────────────────────────┘");

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

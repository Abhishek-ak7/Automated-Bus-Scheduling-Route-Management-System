/**
 * ──────────────────────────────────────────────────────
 *  5-BUS SIMULATOR
 * ──────────────────────────────────────────────────────
 *  Connects to the server via Socket.IO and moves 5
 *  buses along their routes simultaneously.
 *
 *  Each bus moves from its first stop → last stop,
 *  emitting locationUpdate every 3 seconds.
 *
 *  Run:  node simulate-buses.js
 *        (make sure the server is running first)
 * ──────────────────────────────────────────────────────
 */

const io = require("socket.io-client");
const mongoose = require("mongoose");
require("dotenv").config();

/* ── route waypoints (same as seed) ───────────────── */
const STOP_COORDS = {
  LPU01: { lat: 31.2536, lng: 75.7050 },
  PHG:   { lat: 31.2717, lng: 75.6728 },
  NKD:   { lat: 31.2898, lng: 75.6406 },
  KRT:   { lat: 31.3079, lng: 75.6084 },
  JAL01: { lat: 31.3260, lng: 75.5762 },
  GRY:   { lat: 31.2780, lng: 75.6350 },
  KPT:   { lat: 31.3050, lng: 75.5450 },
  ADP:   { lat: 31.2870, lng: 75.5700 },
  BHP:   { lat: 31.3150, lng: 75.5900 },
  LMB:   { lat: 31.2650, lng: 75.6900 },
};

const ROUTE_STOPS = {
  R200: ["LPU01", "PHG", "NKD", "KRT", "JAL01"],
  R301: ["JAL01", "BHP", "KRT", "GRY", "LMB", "LPU01"],
  R402: ["JAL01", "KPT", "ADP", "NKD", "PHG", "LPU01"],
};

/* Bus definitions — must match seed */
const BUS_DEFS = [
  { busNumber: "DL-1P-0501", routeCode: "R200", speed: 0.040 },
  { busNumber: "DL-1P-0502", routeCode: "R200", speed: 0.032 },
  { busNumber: "DL-1P-0601", routeCode: "R301", speed: 0.045 },
  { busNumber: "DL-1P-0602", routeCode: "R301", speed: 0.035 },
  { busNumber: "DL-1P-0701", routeCode: "R402", speed: 0.038 },
];

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const TICK_MS = 3000; // emit every 3 seconds

/* ═════════════════════════════════════════════════════ */
/*  Helpers                                              */
/* ═════════════════════════════════════════════════════ */

/** Linear interpolation between A and B by factor t ∈ [0,1] */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Euclidean distance (good enough for tiny deltas) */
function dist(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

/**
 * Build an array of tiny waypoints that the bus follows each tick.
 * The bus moves `speed` degrees-per-tick along the polyline.
 */
function buildPath(stopCodes, speed) {
  const coords = stopCodes.map((c) => STOP_COORDS[c]);
  const points = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const segLen = dist(a, b);
    const steps = Math.max(1, Math.ceil(segLen / speed));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push({ lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) });
    }
  }
  // push final point
  const last = coords[coords.length - 1];
  points.push({ lat: last.lat, lng: last.lng });
  return points;
}

/* ═════════════════════════════════════════════════════ */
/*  Main                                                 */
/* ═════════════════════════════════════════════════════ */

async function main() {
  /* Fetch busIds from DB */
  await mongoose.connect(process.env.MONGO_URI);
  const Bus = require("./src/models/Bus");
  const busIdMap = {}; // busNumber → ObjectId string

  for (const def of BUS_DEFS) {
    const doc = await Bus.findOne({ busNumber: def.busNumber });
    if (!doc) {
      console.error(`Bus ${def.busNumber} not found — run seed first!`);
      process.exit(1);
    }
    busIdMap[def.busNumber] = doc._id.toString();
  }
  await mongoose.disconnect();

  console.log("🔌 Connecting to server:", SERVER_URL);
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    console.log("✅ Connected!\n");

    /* Build per-bus state */
    const busStates = BUS_DEFS.map((def) => {
      const busId = busIdMap[def.busNumber];
      const path = buildPath(ROUTE_STOPS[def.routeCode], def.speed);
      socket.emit("registerBus", busId);
      return {
        busId,
        busNumber: def.busNumber,
        routeCode: def.routeCode,
        path,
        idx: 0,
        done: false,
      };
    });

    console.log("┌─────────────┬────────┬───────┬─────────────────────────────┐");
    console.log("│ Bus         │ Route  │ Steps │ From → To                   │");
    console.log("├─────────────┼────────┼───────┼─────────────────────────────┤");
    for (const bs of busStates) {
      const stops = ROUTE_STOPS[bs.routeCode];
      const from = stops[0];
      const to = stops[stops.length - 1];
      console.log(
        `│ ${bs.busNumber.padEnd(11)} │ ${bs.routeCode.padEnd(6)} │ ${String(bs.path.length).padStart(5)} │ ${from} → ${to}${"".padEnd(21 - from.length - to.length)}│`
      );
    }
    console.log("└─────────────┴────────┴───────┴─────────────────────────────┘\n");

    /* Tick loop */
    const interval = setInterval(() => {
      let allDone = true;

      for (const bs of busStates) {
        if (bs.done) continue;
        allDone = false;

        const pt = bs.path[bs.idx];

        socket.emit("locationUpdate", {
          busId: bs.busId,
          lat: pt.lat,
          lng: pt.lng,
        });

        const pct = Math.round((bs.idx / (bs.path.length - 1)) * 100);
        process.stdout.write(
          `  🚍 ${bs.busNumber} [${bs.routeCode}] ${pct}%  (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})` +
          (bs.idx % 5 === 0 ? "\n" : "  ")
        );

        bs.idx++;
        if (bs.idx >= bs.path.length) {
          bs.done = true;
          console.log(`\n  🏁 ${bs.busNumber} [${bs.routeCode}] REACHED DESTINATION`);
          socket.emit("tripComplete", { busId: bs.busId, lat: pt.lat, lng: pt.lng });
        }
      }

      if (allDone) {
        console.log("\n\n✅ All 5 buses have completed their trips!");
        clearInterval(interval);
        setTimeout(() => {
          socket.disconnect();
          process.exit(0);
        }, 2000);
      }
    }, TICK_MS);
  });

  socket.on("connect_error", (err) => {
    console.error("Connection failed:", err.message);
    console.error("Is the server running on", SERVER_URL, "?");
    process.exit(1);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

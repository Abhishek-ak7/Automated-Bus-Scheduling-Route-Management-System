/**
 * ──────────────────────────────────────────────────────
 *  DEMAND HEATMAP SEED
 * ──────────────────────────────────────────────────────
 *  Generates realistic-looking demand events spread
 *  over the last 24 hours so the heatmap has data
 *  to render immediately.
 *
 *  Run:  node seed-demand.js
 * ──────────────────────────────────────────────────────
 */

const mongoose = require("mongoose");
require("dotenv").config();

require("./src/models/Stop");
require("./src/models/DemandLog");

const Stop = mongoose.model("Stop");
const DemandLog = mongoose.model("DemandLog");

/* ── demand weights per stop (higher = more popular) ─ */
const DEMAND_WEIGHTS = {
  LPU01: 120,  // university — very high
  JAL01: 100,  // city bus stand — very high
  PHG:   55,   // bypass — medium-high
  NKD:   40,   // chowk — medium
  KRT:   20,   // turn — low
  GRY:   30,   // chowk — medium-low
  KPT:   45,   // gate — medium
  ADP:   15,   // bypass — low
  BHP:   10,   // turn — low
  LMB:   25,   // stop — medium-low
};

const SOURCES = ["arrival_check", "trip_search", "nearby_search", "map_tap"];
const SOURCE_WEIGHTS = [0.45, 0.30, 0.15, 0.10]; // probability distribution

function pickSource() {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < SOURCES.length; i++) {
    cum += SOURCE_WEIGHTS[i];
    if (r < cum) return SOURCES[i];
  }
  return SOURCES[0];
}

/** Random date within the last `hours` hours, weighted toward recent */
function randomRecentDate(hours = 24) {
  const now = Date.now();
  // bias toward more recent times (sqrt distribution)
  const ago = Math.pow(Math.random(), 0.6) * hours * 3600_000;
  return new Date(now - ago);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  /* load stops */
  const stops = await Stop.find({ isActive: true }).lean();
  const stopMap = {};
  for (const s of stops) stopMap[s.stopCode] = s;

  /* clear old demand logs */
  const deleted = await DemandLog.deleteMany({});
  console.log(`  Cleared ${deleted.deletedCount} old demand logs\n`);

  /* generate events */
  const docs = [];
  for (const [code, weight] of Object.entries(DEMAND_WEIGHTS)) {
    const stop = stopMap[code];
    if (!stop) {
      console.log(`  ⚠ Stop ${code} not found — skipping`);
      continue;
    }

    // Add some randomness: weight ± 20%
    const count = Math.round(weight * (0.8 + Math.random() * 0.4));

    for (let i = 0; i < count; i++) {
      docs.push({
        stop: stop._id,
        source: pickSource(),
        location: { lat: stop.location.lat, lng: stop.location.lng },
        createdAt: randomRecentDate(24),
      });
    }

    const level =
      weight >= 80 ? "🔴 High" : weight >= 40 ? "🟡 Medium" : "🟢 Low";
    console.log(
      `  ${stop.stopName.padEnd(22)} ${code.padEnd(6)} ${level.padEnd(12)} ~${count} events`
    );
  }

  /* bulk insert */
  await DemandLog.insertMany(docs);
  console.log(`\n✅  Inserted ${docs.length} demand events across ${Object.keys(DEMAND_WEIGHTS).length} stops`);
  console.log("   Open /demand-heatmap in the browser to see the heatmap!\n");

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

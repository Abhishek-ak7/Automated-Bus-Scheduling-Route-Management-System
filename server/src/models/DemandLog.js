const mongoose = require("mongoose");

/**
 * Tracks passenger demand signals — every time a passenger
 * checks arrivals, searches a trip, or taps a stop on the map
 * we log an event here.  The heatmap API aggregates these.
 */
const demandLogSchema = new mongoose.Schema(
  {
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    /** What triggered the demand signal */
    source: {
      type: String,
      enum: ["arrival_check", "trip_search", "nearby_search", "map_tap"],
      default: "arrival_check",
    },
    /** Optional — which route was involved */
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
    },
    /** Snapshot of stop location (so heatmap works even if stop is later moved) */
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

/* indexes for fast aggregation */
demandLogSchema.index({ stop: 1, createdAt: -1 });
demandLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 }); // auto-delete after 90 days

module.exports = mongoose.model("DemandLog", demandLogSchema);

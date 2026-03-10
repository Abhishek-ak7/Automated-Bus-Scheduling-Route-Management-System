const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getHeatmapData,
  getHeatmapStats,
  logDemandManual,
} = require("../controllers/heatmapController");

/* GET endpoints are admin-only */
router.get("/", protect, getHeatmapData);
router.get("/stats", protect, getHeatmapStats);

/* POST /log stays public — passengers trigger demand events */
router.post("/log", logDemandManual);

module.exports = router;

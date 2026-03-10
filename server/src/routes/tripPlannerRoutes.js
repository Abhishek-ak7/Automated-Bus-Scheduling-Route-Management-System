const express = require("express");
const router = express.Router();

const {
  searchRoutes,
  getStopsForPlanner,
} = require("../controllers/tripPlannerController");

// Both endpoints are PUBLIC (no auth) – passengers don't need to log in
router.get("/stops", getStopsForPlanner);
router.post("/search", searchRoutes);

module.exports = router;

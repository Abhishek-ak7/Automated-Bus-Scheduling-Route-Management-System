const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getHourlyTrips,
  getDailyTrips,
  getFleetStatus,
  getRoutePerformance,
  getDelayDistribution,
} = require("../controllers/analyticsController");

router.get("/dashboard", getDashboardStats);
router.get("/trips/hourly", getHourlyTrips);
router.get("/trips/daily", getDailyTrips);
router.get("/fleet/status", getFleetStatus);
router.get("/routes/performance", getRoutePerformance);
router.get("/delays/distribution", getDelayDistribution);

module.exports = router;

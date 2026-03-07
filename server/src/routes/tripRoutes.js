const express = require("express");
const router = express.Router();

const {
  getTripProgress,
  getActiveTrips,
} = require("../controllers/tripController");

/* GET all active / running trips */
router.get("/active", getActiveTrips);

/* GET progress for a specific bus's running trip */
router.get("/active/:busId/progress", getTripProgress);

module.exports = router;

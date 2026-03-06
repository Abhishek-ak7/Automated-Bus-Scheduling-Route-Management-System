require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

/* ROUTES */
const authRoutes = require("./src/routes/authRoutes");
const stopRoutes = require("./src/routes/stopRoutes");
const routeRoutes = require("./src/routes/routeRoutes");
const busRoutes = require("./src/routes/busRoutes");
const scheduleRoutes = require("./src/routes/scheduleRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");

/* MIDDLEWARE */
const { protect, authorize } = require("./src/middleware/authMiddleware");

const app = express();

/* GLOBAL MIDDLEWARE */
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/* ============================= */
/* API ROUTES */
/* ============================= */

app.use("/api/auth", authRoutes);

app.use("/api/stops", protect, stopRoutes);
app.use("/api/routes", protect, routeRoutes);
app.use("/api/buses", protect, busRoutes);
app.use("/api/schedules", protect, scheduleRoutes);
app.use("/api/analytics", protect, analyticsRoutes);

/* ============================= */
/* ADMIN TEST ROUTE */
/* ============================= */

app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({
    success: true,
    message: "Admin panel access granted",
    user: req.user.name,
  });
});

/* ============================= */
/* USER TEST ROUTE */
/* ============================= */

app.get("/api/secret", protect, (req, res) => {
  res.json({
    success: true,
    message: "Welcome " + req.user.name,
    role: req.user.role,
  });
});

/* ============================= */
/* HEALTH CHECK */
/* ============================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is healthy",
  });
});

/* ============================= */
/* ROOT */
/* ============================= */

app.get("/", (req, res) => {
  res.send("🚍 DTC Smart Bus Scheduling Backend Running");
});

/* ============================= */
/* GLOBAL ERROR HANDLER */
/* ============================= */

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ============================= */

module.exports = app;
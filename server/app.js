const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();


const authRoutes = require('./src/routes/authRoutes');
const { protect, authorize } = require('./src/middleware/authMiddleware');
const stopRoutes = require('./src/routes/stopRoutes');
const routeRoutes = require('./src/routes/routeRoutes');

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/routes', routeRoutes);

app.get('/api/admin', protect, authorize('admin'), (req, res) => {
  res.json({
    message: "Admin panel access granted",
    user: req.user.name
  });
});

app.get('/api/secret', protect, (req, res) => {
  res.json({
    message: "Welcome " + req.user.name,
    role: req.user.role
  });
});

// test route
app.get('/', (req, res) => {
  res.send("DTC Bus Scheduling Backend Running 🚍");
});

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

module.exports = app;

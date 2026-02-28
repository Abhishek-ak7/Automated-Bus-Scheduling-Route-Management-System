const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/routeController');

router.get('/', ctrl.getAllRoutes);
router.get('/:id', ctrl.getRoute);

router.post('/', protect, authorize('admin'), ctrl.createRoute);

module.exports = router;

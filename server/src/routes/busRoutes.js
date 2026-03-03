const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/busController');

router.get('/', protect, ctrl.getAllBuses);

router.post('/', protect, authorize('admin'), ctrl.createBus);

router.put('/:id/assign-route', protect, authorize('admin'), ctrl.assignRoute);

module.exports = router;

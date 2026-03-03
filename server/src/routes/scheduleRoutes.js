const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/scheduleController');

router.get('/', protect, ctrl.getSchedules);
router.post('/', protect, authorize('admin'), ctrl.createSchedule);

module.exports = router;

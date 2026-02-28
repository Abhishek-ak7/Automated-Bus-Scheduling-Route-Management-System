const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/stopController');

router.get('/', ctrl.getAllStops);

router.post('/', protect, authorize('admin'), ctrl.createStop);

router.put('/:id', protect, authorize('admin'), ctrl.updateStop);

router.delete('/:id', protect, authorize('admin'), ctrl.deleteStop);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

// Fetch dashboard data (for logged-in user only)
router.get('/', protect, controller.getDashboardData);

// Update progress
// router.post('/update', protect, controller.updateProgress);

// Progress stats
router.get('/stats', protect, controller.getProgressStats);

module.exports = router;

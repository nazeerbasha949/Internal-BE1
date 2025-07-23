const express = require('express');
const router = express.Router();
const { getPlatformStats } = require('../controllers/statsController');
const { protect, allowRoles } = require('../middleware/auth.middleware');

router.get('/overview', protect, allowRoles('admin'), getPlatformStats);

module.exports = router;

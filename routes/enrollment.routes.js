const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// Enroll in a course
router.post('/', protect, enrollmentController.enrollInCourse);

// Get enrollments
router.get('/', protect, allowRoles('admin'), enrollmentController.getAllEnrollments);
router.get('/user/:userId', protect, allowRoles('admin'), enrollmentController.getEnrollmentsByUser);

// Stats
router.get('/stats/metrics', protect, enrollmentController.enrollmentStats);


// 🆕 self‑service routes
router.get('/me', protect, enrollmentController.getMyEnrollments);
router.get('/me/stats', protect, enrollmentController.getMyEnrollmentStats);


module.exports = router;

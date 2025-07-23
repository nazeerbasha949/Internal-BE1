const express = require('express');
const router = express.Router();
const controller = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/users',protect, controller.getUserStats);
router.get('/course-enrollments', protect, controller.getCourseEnrollments);
router.get('/course-completions', protect, controller.getCourseCompletionRates);
router.get('/quiz-performance', protect, controller.getQuizScores);
router.get('/event-participation', protect, controller.getEventParticipation);
router.get('/registrations-daily', protect, controller.getDailyRegistrations);

module.exports = router;

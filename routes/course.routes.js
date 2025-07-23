const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');



// Course CRUD
router.post('/', protect, allowRoles('admin'), courseController.createCourse);
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourse);
router.put('/:id', protect, allowRoles('admin'), courseController.updateCourse);
router.delete('/:id', protect, allowRoles('admin'), courseController.deleteCourse);

// Enroll user
router.post('/:courseId/enroll', protect, courseController.enrollUser);

// Stats
router.get('/stats/metrics', protect, courseController.courseStats);

module.exports = router;

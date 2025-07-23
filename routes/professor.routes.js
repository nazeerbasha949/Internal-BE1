const express = require('express');
const router = express.Router();
const professorController = require('../controllers/professor.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// CRUD
router.post('/', protect, allowRoles('admin'), professorController.createProfessor);
router.get('/', protect, professorController.getAllProfessors);
router.get('/:id', protect, professorController.getProfessor);
router.put('/:id', protect, allowRoles('admin'), professorController.updateProfessor);
router.delete('/:id', protect, allowRoles('admin'), professorController.deleteProfessor);

// Assign course
router.post('/assign-course', protect, allowRoles('admin'), professorController.assignCourseToProfessor);

// Add this to your professorRoutes.js or courseRoutes.js
router.post('/unassign-course', protect, allowRoles('admin'), professorController.unassignCourseFromProfessor);


// Stats
router.get('/stats/metrics', protect, professorController.professorStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');

// 👇 Add this route at the end or near user-related routes
router.get('/my-score', protect, quizController.getMyQuizScore);

router.post('/create', protect, allowRoles('admin'), quizController.createQuiz);
router.get('/', protect, quizController.getAllQuizzes);
router.get('/stats', protect, quizController.quizStats);
router.get('/:id', protect, quizController.getQuizById);
router.put('/:id', protect, allowRoles('admin'), quizController.updateQuiz);
router.delete('/:id', protect, allowRoles('admin'), quizController.deleteQuiz);
router.post('/submit', protect, quizController.submitAttempt);
// Get attempts for specific user (admin only)
router.get('/attempts/:userId', protect, allowRoles('admin'), quizController.getUserAttempts);
// assign quiz to batch
router.post('/assign-to-batch', protect, allowRoles('admin'), quizController.assignQuizToBatch);



module.exports = router;

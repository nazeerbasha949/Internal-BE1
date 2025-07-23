const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');

router.post('/create', protect, allowRoles('admin'), batchController.createBatch);

// GET /api/batches/available-users/:courseId
router.get('/available-users/:courseId', batchController.getAvailableUsersForBatch);

// GET /api/batches/user-breakdown/:courseId/:batchId
router.get('/user-breakdown/:courseId/:batchId', batchController.getBatchUserBreakdown);

// routes/batchRoutes.js
router.put('/markAsCompleted/:id', protect, allowRoles('admin'), batchController.markCourseCompleted);

router.get('/', protect, allowRoles('admin'), batchController.getAllBatches);
router.post('/assign-quiz', protect, allowRoles('admin'), batchController.assignQuizToBatch);
router.get('/:id', protect, allowRoles('admin'), batchController.getBatch);
router.put('/:id', protect, allowRoles('admin'), batchController.updateBatch);
router.delete('/:id', protect, allowRoles('admin'), batchController.deleteBatch);

router.post('/send-certificates', protect, allowRoles('admin'), batchController.sendBatchCertificates);

module.exports = router;

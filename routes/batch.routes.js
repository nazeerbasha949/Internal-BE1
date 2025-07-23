const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// Example: GET /api/batches/date-range?startDate=2025-06-01&endDate=2025-07-30
router.get('/date-range', batchController.getBatchesByDateRange);



router.post('/',  protect, allowRoles('admin'),  batchController.createBatch);
router.get('/',  protect, allowRoles('admin'),  batchController.getAllBatches);
router.get('/stats',  protect, allowRoles('admin'),  batchController.getBatchStats);
router.get('/:id',  protect, allowRoles('admin'),  batchController.getBatchById);
router.put('/:id',  protect, allowRoles('admin'),  batchController.updateBatch);
router.delete('/:id',  protect, allowRoles('admin'),  batchController.deleteBatch);



router.post('/send-certificates', protect, allowRoles('admin'), batchController.sendBatchCertificates);

// GET /api/batches/available-users/:courseId
router.get('/available-users/:courseId', batchController.getAvailableUsersForBatch);

// GET /api/batches/user-breakdown/:courseId/:batchId
router.get('/user-breakdown/:courseId/:batchId', batchController.getBatchUserBreakdown);


module.exports = router;

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');

router.post('/create', protect, notificationController.createNotification);
// router.post('/create', protect, notificationController.createNotification);
router.get('/my-notifications', protect, notificationController.getNotificationsByUser);
router.put('/mark-read/:notificationId', protect, notificationController.markAsRead);
router.delete('/:id', protect, notificationController.deleteNotification);
router.get('/stats', protect, notificationController.notificationStats);

router.post(
  '/batch',
  protect,
  allowRoles('admin'),                     // <-- your RBAC helper
  notificationController.createBatchNotification
);

module.exports = router;

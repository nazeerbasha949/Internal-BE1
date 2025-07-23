const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// Get Waiting Users
router.get('/waiting', protect, allowRoles('admin'), userController.getWaitingUsers);


// Get all users (Admin)
router.get('/', protect, allowRoles('admin'), userController.getAllUsers);

// Get specific user by ID
router.get('/:id', protect, allowRoles('admin'), userController.getUser);

// Approve or reject user registration (Admin)
router.put('/status/:id', protect, allowRoles('admin'), userController.updateUserStatus);

// router.put('/update-role', protect, allowRoles('Admin'), userController.updateUserRole);


// Delete user (Admin)
router.delete('/:id', protect, allowRoles('admin'), userController.deleteUser);

// Get user metrics
router.get('/stats/metrics', protect, allowRoles('admin'), userController.userStats);



router.put('/admin/update-user/:id', protect, allowRoles('admin'), userController.updateUserByAdmin);
router.put('/me/update-profile', protect, userController.updateOwnProfile);


module.exports = router;

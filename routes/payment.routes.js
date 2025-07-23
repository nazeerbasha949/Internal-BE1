const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');

// Payment routes}

router.post('/create', protect, paymentController.createOrder);
router.post('/verify', protect, allowRoles('admin'), paymentController.verifyPayment);
router.get('/all', protect, allowRoles('admin'), paymentController.getAllPayments); // Admin route

module.exports = router;

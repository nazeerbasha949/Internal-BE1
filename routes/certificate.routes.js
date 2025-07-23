const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const controller = require('../controllers/certificate.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// Generate and send certificate
// router.post('/issue', protect, allowRoles('admin'), certificateController.issueCertificate);
router.post('/issue', protect, certificateController.issueCertificate);

router.post('/generate', protect, controller.generateCertificate);
router.get('/user/:userId/:courseId', protect, controller.getUserCertificate);
router.get('/validate/:id', protect, controller.validateCertificate);
router.get('/download/:id', protect, controller.downloadCertificate);
router.get('/all', protect, allowRoles('admin'), controller.getAllCertificates);
router.get('/stats', protect, controller.certificateStats);

module.exports = router;



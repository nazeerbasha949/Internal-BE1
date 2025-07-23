const router = require('express').Router();
const uploadCtrl = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const {
  uploadResume,
  uploadMaterial,
  uploadBanner
} = require('../middlewares/upload.middleware');

// Resume (Interns)
router.post('/resume', protect, allowRoles('Intern'), uploadResume.single('resume'), uploadCtrl.uploadUserResume);

// Course Material (Admin/Professor)
router.post('/course-material', protect, allowRoles('Admin', 'Professor'), uploadMaterial.array('files'), uploadCtrl.uploadCourseMaterial);

// Event Banner (Admin)
router.post('/event-banner', protect, allowRoles('Admin'), uploadBanner.single('banner'), uploadCtrl.uploadEventBanner);

module.exports = router;

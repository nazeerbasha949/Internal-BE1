const multer = require('multer');
const path = require('path');

// File storage
const getStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, `uploads/${folder}`),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${file.fieldname}${ext}`);
    }
  });

// Filters
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

// Exported uploaders
exports.uploadResume = multer({
  storage: getStorage('resumes'),
  fileFilter: fileFilter(['.pdf', '.doc', '.docx'])
});

exports.uploadCertificate = multer({
  storage: getStorage('certificates'),
  fileFilter: fileFilter(['.pdf', '.png', '.jpg', '.jpeg'])
});

exports.uploadMaterial = multer({
  storage: getStorage('materials'),
  fileFilter: fileFilter(['.pdf', '.ppt', '.pptx', '.zip'])
});

exports.uploadBanner = multer({
  storage: getStorage('banners'),
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png'])
});

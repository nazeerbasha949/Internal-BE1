const cloudinary = require('./cloudinary');
const fs = require('fs');

const uploadCertificateToCloudinary = async (localFilePath, fileName) => {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: 'certificates',
      resource_type: 'raw',
      public_id: fileName.replace('.pdf', '')
    });

    // Delete local file after upload
    fs.unlinkSync(localFilePath);

    return result.secure_url; // This is the Cloudinary URL
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    throw err;
  }
};

module.exports = uploadCertificateToCloudinary;

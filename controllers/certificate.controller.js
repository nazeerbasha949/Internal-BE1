const { generateCertificate } = require('../utils/certificateGenerator');
const sendCertificateMail = require('../utils/mailer');
const Progress = require('../models/Progress');
const User = require('../models/User');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');
const generateCertificateId = require('../utils/generateCertificateId');
const cloudinary = require('../utils/cloudinary');
const streamifier = require('streamifier');

// Auto Trigger Certificate Generation (for Admin)
exports.generateCertificate = async (req, res) => {
    try {
        const { courseId, score } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        const course = await Course.findById(courseId);
        if (!user || !course) return res.status(404).json({ message: 'Invalid user or course' });

        const certificate = await Certificate.create({
            certificateId: generateCertificateId(),
            user: userId,
            course: courseId,
            score,
            passed: true,
            downloadLink: `/certificates/${userId}_${courseId}.pdf`
        });

        res.status(201).json({ message: 'Certificate issued', certificate });
    } catch (err) {
        res.status(500).json({ message: 'Failed to issue certificate', error: err.message });
    }
};

// 🧾 Issue certificate only if course is completed
exports.issueCertificate = async (req, res) => {
    try {
        const userId = req.user._id;
        const { courseId } = req.body;

        const user = await User.findById(userId);
        const course = await Course.findById(courseId);
        const progress = await Progress.findOne({ user: userId, course: courseId });

        if (!user || !course) return res.status(404).json({ message: 'User or Course not found' });
        if (!progress || !progress.isCompleted) return res.status(400).json({ message: 'User has not completed the course' });

        const certificateId = `CERT-${userId.toString().slice(-4)}-${Date.now()}`;

        // ✅ Generate PDF buffer
        const pdfBuffer = await generateCertificate({
            userName: user.name,
            courseTitle: course.title
        });

        // ✅ Upload buffer to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    public_id: `certificates/${certificateId}`,
                    folder: 'certificates',
                    format: 'pdf'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
        });

        const fileUrl = uploadResult.secure_url;

        // ✅ Save to Progress
        progress.certificateUrl = fileUrl;
        await progress.save();

        // ✅ Send email
        await sendCertificateMail(user.email, user.name, course.title, fileUrl);

        res.status(200).json({
            message: 'Certificate generated and emailed successfully',
            certificateUrl: fileUrl
        });
    } catch (error) {
        console.error("Certificate generation error →", error);
        res.status(500).json({
            message: 'Certificate generation failed',
            error: error.message || "Unknown error"
        });
    }
};

// 📄 Get user's certificate for a specific course
exports.getUserCertificate = async (req, res) => {
    try {
        const userId = req.user._id;
        const courseId = req.params.courseId;

        const cert = await Certificate.findOne({ user: userId, course: courseId }).populate('user course');
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        res.status(200).json(cert);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching certificate', error: err.message });
    }
};

// ✅ Validate certificate (anyone can call this)
exports.validateCertificate = async (req, res) => {
    try {
        const cert = await Certificate.findOne({ certificateId: req.params.id }).populate('user course');
        if (!cert) return res.status(404).json({ message: 'Invalid Certificate ID' });

        res.status(200).json({
            valid: true,
            issuedTo: cert.user.fullName || cert.user.name,
            courseTitle: cert.course.title,
            issuedAt: cert.issuedAt,
            score: cert.score
        });
    } catch (err) {
        res.status(500).json({ message: 'Validation failed', error: err.message });
    }
};

// 🔽 Download certificate file
exports.downloadCertificate = async (req, res) => {
  try {
    const { id: certificateId } = req.params;

    // 1. Get certificate metadata
    const cert = await Certificate.findOne({ certificateId }).populate('user course');
    if (!cert) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // 2. Generate the certificate in memory
    const pdfBuffer = await generateCertificate({
      userName: cert.user.name,
      courseTitle: cert.course.title,
    });

    // 3. Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cert.user.name}_${cert.course.title}_certificate.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    // 4. Send PDF buffer
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Download error →', err);
    res.status(500).json({
      message: 'Download failed',
      error: err.message || 'Internal server error',
    });
  }
};


// 👨‍🎓 Get all certificates for current user
exports.getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ user: req.user._id }).populate('course');
        res.status(200).json(certs);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch certificates', error: err.message });
    }
};

// 📊 Admin Only - All Certificates
exports.getAllCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find().populate('user course');
        res.status(200).json(certs);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch certificates', error: err.message });
    }
};

// 📈 Certificate Stats
exports.certificateStats = async (req, res) => {
    try {
        const total = await Certificate.countDocuments();
        const validated = await Certificate.countDocuments({ validated: true });
        const uniqueUsers = await Certificate.distinct('user');

        res.status(200).json({ total, validated, uniqueUsers: uniqueUsers.length });
    } catch (err) {
        res.status(500).json({ message: 'Stats fetch error', error: err.message });
    }
};

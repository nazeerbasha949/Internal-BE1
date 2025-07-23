const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Enroll in course (with/without payment)
exports.enrollInCourse = async (req, res) => {
  try {
    const { userId, courseId, amountPaid, paymentMethod, transactionId, paymentStatus, receiptUrl } = req.body;

    const alreadyEnrolled = await Enrollment.findOne({ user: userId, course: courseId });
    if (alreadyEnrolled) return res.status(400).json({ message: "User already enrolled" });

    const newEnrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      amountPaid,
      paymentMethod,
      transactionId,
      paymentStatus,
      receiptUrl
    });

    // Add user to course.enrolledUsers
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledUsers: userId }
    });

    res.status(201).json({ message: "Enrolled successfully", enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ message: "Error enrolling in course", error });
  }
};

// Get all enrollments (admin)
exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('user', 'name email')
      .populate('course', 'title');
    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching enrollments", error });
  }
};

// Get enrollments for a user
exports.getEnrollmentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const enrollments = await Enrollment.find({ user: userId })
      .populate('course', 'title');
    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user enrollments", error });
  }
};

// Enrollment stats (admin)
exports.enrollmentStats = async (req, res) => {
  try {
    const totalEnrollments = await Enrollment.countDocuments();
    const totalRevenue = await Enrollment.aggregate([
      { $match: { paymentStatus: "Success" } },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } }
    ]);
    const byMethod = await Enrollment.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      totalEnrollments,
      totalRevenue: totalRevenue[0]?.total || 0,
      byMethod
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};



// GET  /api/enrollments/me
// List all courses the logged‑in user is enrolled in
exports.getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.id;            // populated by protect middleware

    const enrollments = await Enrollment.find({ user: userId })
      .populate('course', 'title coverImage category type level status');

    return res.status(200).json({
      message: 'Your enrolled courses',
      data: enrollments,
    });
  } catch (err) {
    console.error('Get my enrollments error →', err);
    return res.status(500).json({ message: 'Failed to fetch enrollments', error: err });
  }
};

// GET  /api/enrollments/me/stats
// Returns simple counts & revenue for the current user
exports.getMyEnrollmentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Total enrollments
    const myTotal = await Enrollment.countDocuments({ user: userId });

    // Completed vs in‑progress via Progress collection (optional)
    const completedCount = await Progress.countDocuments({
      user: userId,
      isCompleted: true,
    });
    const inProgressCount = await Progress.countDocuments({
      user: userId,
      isCompleted: false,
    });

    // Revenue the user has paid (if relevant)
    const paidAgg = await Enrollment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), paymentStatus: 'Success' } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]);

    return res.status(200).json({
      enrolled: myTotal,
      completed: completedCount,
      inProgress: inProgressCount,
      amountSpent: paidAgg[0]?.total || 0,
    });
  } catch (err) {
    console.error('My enrollment stats error →', err);
    return res.status(500).json({ message: 'Failed to fetch stats', error: err });
  }
};

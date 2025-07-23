const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const Event = require('../models/Event');
const Course = require('../models/Course');
const Batch = require('../models/Batch');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    // ✅ Enrolled progress with course details
    const progress = await Progress.find({ user: userId }).populate('course');

    // ✅ Completed course list from progress
    const completedCourses = progress
      .filter(p => p.isCompleted)
      .map(p => p.course);

    // ✅ Certificates
    const certificates = await Certificate.find({ user: userId }).populate('course');

    // ✅ Registered events
    const events = await Event.find({ registeredUsers: userId });

    // ✅ Batches where the user is enrolled
    const batches = await Batch.find({ users: userId })
      .populate('course')
      .populate('professor', 'name email linkedIn profileImage designation');

    res.status(200).json({
      message: 'Dashboard data fetched',
      enrolledCourses: progress,
      completedCourses,
      certificates,
      registeredEvents: events,
      enrolledBatches: batches
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard data',
      error: error.message || error
    });
  }
};



exports.getProgressStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const progress = await Progress.find({ user: userId });
    const totalCourses = progress.length;
    const completedCourses = progress.filter(p => p.progressPercentage === 100).length;
    const averageProgress = progress.reduce((acc, p) => acc + p.progressPercentage, 0) / (totalCourses || 1);

    res.status(200).json({
      totalCourses,
      completedCourses,
      averageProgress: Math.floor(averageProgress)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err });
  }
};


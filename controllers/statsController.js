const User = require('../models/User');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const Event = require('../models/Event');
const Quiz = require('../models/Quiz');

exports.getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, approvedUsers, pendingUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: true }),
      User.countDocuments({ isApproved: false }),
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const totalCourses = await Course.countDocuments();
    const courses = await Course.find({}, 'title enrolledUsers completedUsers');

    const totalProgress = await Progress.countDocuments();
    const completedCourses = await Progress.countDocuments({ isCompleted: true });
    const inProgressCourses = await Progress.countDocuments({ isCompleted: false });

    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ date: { $gte: new Date() } });
    const pastEvents = await Event.countDocuments({ date: { $lt: new Date() } });

    const totalQuizzes = await Quiz.countDocuments();
    const quizzesCompleted = await Quiz.countDocuments({ isCompleted: true });
    const quizzesAssigned = await Quiz.countDocuments();

    res.status(200).json({
      users: {
        total: totalUsers,
        approved: approvedUsers,
        pending: pendingUsers,
        byRole: usersByRole,
      },
      courses: {
        total: totalCourses,
        details: courses,
      },
      progress: {
        total: totalProgress,
        completed: completedCourses,
        inProgress: inProgressCourses,
      },
      events: {
        total: totalEvents,
        upcoming: upcomingEvents,
        past: pastEvents,
      },
      quizzes: {
        total: totalQuizzes,
        assigned: quizzesAssigned,
        completed: quizzesCompleted,
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error });
  }
};

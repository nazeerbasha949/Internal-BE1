const User = require('../models/User');
const StudentProgress = require('../models/StudentProgress');
const Certificate = require('../models/Certificate');
const Event = require('../models/Event');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');

// User Counts
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });

    res.status(200).json({ totalUsers, activeUsers });
  } catch (err) {
    res.status(500).json({ message: 'User stats error', error: err });
  }
};

// Enrollments per course
exports.getCourseEnrollments = async (req, res) => {
  try {
    const enrollments = await StudentProgress.aggregate([
      {
        $group: {
          _id: '$course',
          totalEnrolled: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          courseId: '$course._id',
          courseTitle: '$course.title',
          totalEnrolled: 1
        }
      }
    ]);

    res.status(200).json(enrollments);
  } catch (err) {
    res.status(500).json({ message: 'Enrollment stats error', error: err });
  }
};

// Completion rate per course
exports.getCourseCompletionRates = async (req, res) => {
  try {
    const progress = await StudentProgress.aggregate([
      {
        $group: {
          _id: '$course',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$progressPercentage', 100] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          courseTitle: '$course.title',
          total,
          completed,
          completionRate: {
            $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }]
          }
        }
      }
    ]);

    res.status(200).json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Course completion stats error', error: err });
  }
};

// Quiz performance by course
exports.getQuizScores = async (req, res) => {
  try {
    const progress = await StudentProgress.aggregate([
      { $unwind: '$quizScores' },
      {
        $group: {
          _id: '$course',
          avgScore: { $avg: '$quizScores.score' },
          attempts: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $project: {
          courseTitle: '$course.title',
          avgScore: { $round: ['$avgScore', 2] },
          attempts: 1
        }
      }
    ]);

    res.status(200).json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Quiz stats error', error: err });
  }
};

// Event participation
exports.getEventParticipation = async (req, res) => {
  try {
    const events = await Event.aggregate([
      {
        $project: {
          title: 1,
          totalRegistered: { $size: '$registeredUsers' }
        }
      }
    ]);

    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Event stats error', error: err });
  }
};

// Daily registrations
exports.getDailyRegistrations = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Registration stats error', error: err });
  }
};

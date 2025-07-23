const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const sendCertificateMail = require('../utils/mailer');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/mailer');
const { generateCertificate } = require('../utils/certificateGenerator');
const uploadCertificateToCloudinary = require('../utils/uploadCertificateToCloudinary');
const Batch = require('../models/Batch'); // ← import Batch model



exports.completeCoursesByBatch = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) return res.status(400).json({ message: "batchId is required" });

    const batch = await Batch.findById(batchId).populate('users').populate('course');

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const course = batch.course;
    const completedUsers = [];

    for (const user of batch.users) {
      const progress = await Progress.findOne({ user: user._id, course: course._id });
      if (!progress || progress.isCompleted) continue;

      const fileName = `CERT-${user._id}-${Date.now()}.pdf`;
      const localPath = path.join(__dirname, `../certificates/${fileName}`);

      await generateCertificate({
        userName: user.name,
        courseTitle: course.title,
        outputPath: localPath
      });

      const certificateUrl = await uploadCertificateToCloudinary(localPath, fileName);

      progress.isCompleted = true;
      progress.completedAt = new Date();
      progress.certificateUrl = certificateUrl;
      await progress.save();

      const htmlContent = `
        <div style="font-family: Arial; padding: 20px; background: #f4f4f4; border-radius: 10px;">
          <h2 style="color: #2b5a9e;">🎓 Congratulations ${user.name}!</h2>
          <p>You have successfully completed the <strong>${course.title}</strong> course.</p>
          <p>Your certificate is ready. Click the button below to download it:</p>
          <a href="${certificateUrl}" target="_blank" 
             style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #2b5a9e; color: white; text-decoration: none; border-radius: 5px;">
             🎉 View Your Certificate
          </a>
          <p style="margin-top: 20px;">Thank you for learning with <strong>Signavox Career Ladder</strong>!</p>
        </div>
      `;

      await sendCertificateMail(user.email, user.name, course.title, certificateUrl, htmlContent);
      completedUsers.push(user._id);
    }

    return res.status(200).json({
      message: `${completedUsers.length} users in batch marked as completed and emailed`,
      batchId,
      courseId: course._id,
      completedUsers
    });

  } catch (error) {
    console.error('Batch completion error:', error);
    return res.status(500).json({ message: "Course completion by batch failed", error });
  }
};




// Create or update progress
exports.updateProgress = async (req, res) => {
  try {
    const { user, course, enrollment, moduleId, lessonId, topic, quizScore, feedback } = req.body;

    let progress = await Progress.findOne({ user, course });

    if (!progress) {
      progress = await Progress.create({
        user, course, enrollment,
        completedModules: [{
          moduleId,
          completedLessons: [{
            lessonId,
            completedTopics: [topic],
            quizScore,
            feedback
          }]
        }]
      });
    } else {
      // Add or update topic
      const module = progress.completedModules.find(mod => mod.moduleId.toString() === moduleId);
      if (module) {
        const lesson = module.completedLessons.find(les => les.lessonId === lessonId);
        if (lesson) {
          if (!lesson.completedTopics.includes(topic)) lesson.completedTopics.push(topic);
          lesson.quizScore = quizScore || lesson.quizScore;
          lesson.feedback = feedback || lesson.feedback;
        } else {
          module.completedLessons.push({ lessonId, completedTopics: [topic], quizScore, feedback });
        }
      } else {
        progress.completedModules.push({
          moduleId,
          completedLessons: [{ lessonId, completedTopics: [topic], quizScore, feedback }]
        });
      }

      await progress.save();
    }

    res.status(200).json({ message: 'Progress updated', progress });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update progress', error: err });
  }
};

// Mark course as completed & generate certificate
// exports.completeCourse = async (req, res) => {
//   try {
//     const { userId, courseId, certificateUrl } = req.body;

//     const progress = await Progress.findOne({ user: userId, course: courseId });
//     if (!progress) return res.status(404).json({ message: "Progress not found" });

//     progress.isCompleted = true;
//     progress.completedAt = new Date();
//     progress.certificateUrl = certificateUrl;
//     await progress.save();

//     res.status(200).json({ message: "Course marked as completed", progress });
//   } catch (error) {
//     res.status(500).json({ message: "Error completing course", error });
//   }
// };

exports.completeCourse = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const progress = await Progress.findOne({ user: userId, course: courseId }).populate('user').populate('course');
    if (!progress) return res.status(404).json({ message: "Progress not found" });

    const user = progress.user;
    const course = progress.course;

    const fileName = `CERT-${user._id}-${Date.now()}.pdf`;
    const localPath = path.join(__dirname, `../certificates/${fileName}`);

    await generateCertificate({
      userName: user.name,
      courseTitle: course.title,
      outputPath: localPath
    });

    const certificateUrl = await uploadCertificateToCloudinary(localPath, fileName);

    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.certificateUrl = certificateUrl;
    await progress.save();

    await sendCertificateMail(user.email, user.name, course.title, certificateUrl);

    res.status(200).json({ message: "Course marked as completed", progress });
  } catch (error) {
    console.error("Completion Error →", error);
    res.status(500).json({
      message: "Error completing course",
      error: error?.message || "Unknown error"
    });
  }
};


// Batch course complete
exports.completeCoursesBulk = async (req, res) => {
  try {
    const { users } = req.body; // Array of { userId, courseId }
    const completedUsers = [];

    for (const item of users) {
      const user = await User.findById(item.userId);
      const course = await Course.findById(item.courseId);

      if (!user || !course) continue;

      const progress = await Progress.findOne({ user: user._id, course: course._id });
      if (!progress || progress.isCompleted) continue;

      const fileName = `CERT-${user._id}-${Date.now()}.pdf`;
      const localPath = path.join(__dirname, `../certificates/${fileName}`);

      await generateCertificate({
        userName: user.name,
        courseTitle: course.title,
        outputPath: localPath
      });

      const certificateUrl = await uploadCertificateToCloudinary(localPath, fileName);

      progress.isCompleted = true;
      progress.completedAt = new Date();
      progress.certificateUrl = certificateUrl;
      await progress.save();

      const htmlContent = `
        <div style="font-family: Arial; padding: 20px; background: #f4f4f4; border-radius: 10px;">
          <h2 style="color: #2b5a9e;">🎓 Congratulations ${user.name}!</h2>
          <p>You have successfully completed the <strong>${course.title}</strong> course.</p>
          <p>Your certificate is ready. Click the button below to download it:</p>
          <a href="${certificateUrl}" target="_blank" 
             style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #2b5a9e; color: white; text-decoration: none; border-radius: 5px;">
             🎉 View Your Certificate
          </a>
          <p style="margin-top: 20px;">Thank you for learning with <strong>Signavox Career Ladder</strong>!</p>
        </div>
      `;

      await sendCertificateMail(user.email, user.name, course.title, certificateUrl, htmlContent);
      completedUsers.push(user._id);
    }

    res.status(200).json({
      message: `${completedUsers.length} users marked as completed and emailed`,
      completedUsers
    });
  } catch (error) {
    console.error('Bulk completion error:', error);
    res.status(500).json({ message: "Bulk course completion failed", error });
  }
};


// Get All User Progress
exports.getAllUserProgress = async (req, res) => {
  try {
    const allProgress = await Progress.find()
      .populate('user', 'name email role')
      .populate('course', 'title duration')
      .lean();

    res.status(200).json({ message: "All user progress", data: allProgress });
  } catch (error) {
    res.status(500).json({ message: "Error fetching all user progress", error });
  }
};

// Get progress
// exports.getUserProgress = async (req, res) => {
//   try {
//     const userId = req.user.id; // ✅ this is correct
//     const { courseId } = req.params;

//     const progress = await Progress.findOne({ user: userId, course: courseId })
//       .populate('course')
//       .populate('user');

//     if (!progress) return res.status(404).json({ message: "Progress not found" });
//     res.status(200).json(progress);
//   } catch (error) {
//     res.status(500).json({ message: "Error getting progress", error });
//   }
// };


// exports.getUserProgress = async (req, res) => {
//   try {
//     const userId = req.user.id; // From token middleware
//     const { courseId } = req.params;

//     const progress = await Progress.findOne({ user: userId, course: courseId }).populate('user').lean();
//     if (!progress) return res.status(404).json({ message: "Progress not found" });

//     const course = await Course.findById(courseId).lean();
//     if (!course) return res.status(404).json({ message: "Course not found" });

//     // Create maps for faster lookup
//     const moduleMap = new Map();
//     course.modules.forEach(mod => {
//       const lessonMap = new Map();
//       mod.lessons.forEach(lesson => {
//         lessonMap.set(lesson._id.toString(), {
//           id: lesson._id,
//           lessonTitle: lesson.title
//         });
//       });

//       moduleMap.set(mod._id.toString(), {
//         id: mod._id,
//         moduleTitle: mod.moduleTitle,
//         lessons: lessonMap
//       });
//     });

//     // Format completedModules
//     const formattedModules = progress.completedModules.map(mod => {
//       const modInfo = moduleMap.get(mod.moduleId.toString()) || { id: mod.moduleId, moduleTitle: "Unknown Module", lessons: new Map() };

//       const formattedLessons = mod.completedLessons.map(lesson => {
//         const lessonInfo = modInfo.lessons.get(lesson.lessonId.toString()) || { id: lesson.lessonId, lessonTitle: "Unknown Lesson" };

//         return {
//           lessonId: lessonInfo,
//           completedTopics: lesson.completedTopics,
//           quizScore: lesson.quizScore,
//           feedback: lesson.feedback,
//           _id: lesson._id
//         };
//       });

//       return {
//         moduleId: {
//           id: modInfo.id,
//           moduleTitle: modInfo.moduleTitle
//         },
//         completedLessons: formattedLessons,
//         _id: mod._id
//       };
//     });

//     res.status(200).json({
//       ...progress,
//       course,
//       completedModules: formattedModules
//     });

//   } catch (error) {
//     res.status(500).json({ message: "Error getting progress", error });
//   }
// };

// GET /api/progress/:courseId          (protected)
exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id;             // from auth middleware
    const { courseId } = req.params;

    /* ───────────────────────────────────
       1) Verify the course exists
    ─────────────────────────────────── */
    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    /* ───────────────────────────────────
       2) Check enrollment
    ─────────────────────────────────── */
    const enrollment = await Enrollment.findOne({ user: userId, course: courseId }).lean();
    if (!enrollment) {
      return res.status(404).json({ message: 'User is not enrolled in this course' });
    }

    /* ───────────────────────────────────
       3) Pull progress (may be null)
    ─────────────────────────────────── */
    const progressDoc = await Progress.findOne({ user: userId, course: courseId })
      .populate('user')
      .lean();

    // Build lookup maps for nice titles
    const moduleMap = new Map();
    course.modules.forEach((mod) => {
      const lessonMap = new Map();
      mod.lessons.forEach((les) =>
        lessonMap.set(les._id.toString(), { id: les._id, lessonTitle: les.title })
      );
      moduleMap.set(mod._id.toString(), {
        id: mod._id,
        moduleTitle: mod.moduleTitle,
        lessons: lessonMap,
      });
    });

    /* ───────────────────────────────────
       4) If progress exists, format it
    ─────────────────────────────────── */
    let formattedModules = [];
    let isCompleted = false;
    let certificateUrl = null;
    let updatedAt = null;

    if (progressDoc) {
      formattedModules = progressDoc.completedModules.map((mod) => {
        const modInfo =
          moduleMap.get(mod.moduleId.toString()) || {
            id: mod.moduleId,
            moduleTitle: 'Unknown Module',
            lessons: new Map(),
          };

        const formattedLessons = mod.completedLessons.map((les) => {
          const lesInfo =
            modInfo.lessons.get(les.lessonId.toString()) || {
              id: les.lessonId,
              lessonTitle: 'Unknown Lesson',
            };

          return {
            lessonId: lesInfo,
            completedTopics: les.completedTopics,
            quizScore: les.quizScore,
            feedback: les.feedback,
            _id: les._id,
          };
        });

        return {
          moduleId: { id: modInfo.id, moduleTitle: modInfo.moduleTitle },
          completedLessons: formattedLessons,
          _id: mod._id,
        };
      });

      isCompleted = progressDoc.isCompleted || false;
      certificateUrl = progressDoc.certificateUrl || null;
      updatedAt = progressDoc.updatedAt;
    }

    /* ───────────────────────────────────
       5) Build unified response
    ─────────────────────────────────── */
    return res.status(200).json({
      course,
      enrollment: {
        id: enrollment._id,
        enrolledAt: enrollment.createdAt,
      },
      progressExists: !!progressDoc,
      isCompleted,
      certificateUrl,
      updatedAt,
      completedModules: formattedModules,
    });
  } catch (error) {
    console.error('Error getting progress →', error);
    return res.status(500).json({ message: 'Error getting progress', error });
  }
};





// Progress stats
// GET /api/progress/stats  (protected)
exports.progressStats = async (req, res) => {
  try {
    const userId = req.user.id;   // added: current user from token

    // ① Courses user has completed
    const completedCount = await Progress.countDocuments({
      user: userId,
      isCompleted: true,
    });

    // ② Courses user has started but not finished
    const inProgressCount = await Progress.countDocuments({
      user: userId,
      isCompleted: false,
    });

    // ③ Courses user is registered for (via Enrollment collection)
    const registeredCount = await Enrollment.countDocuments({ user: userId });

    return res.status(200).json({
      registered: registeredCount,
      completed: completedCount,
      inProgress: inProgressCount,
    });
  } catch (error) {
    console.error('Stats error →', error);
    return res.status(500).json({
      message: 'Error fetching stats',
      error: error?.message || 'Unknown error',
    });
  }
};







// ─────────────────────────────────────────────────────────────
// GET /api/progress/summary   (protected)
// Returns an array of all courses the user has progress in
// ─────────────────────────────────────────────────────────────

// controllers/progressController.js
exports.getUserCourseProgressSummary = async (req, res) => {
  try {
    const userId = req.user.id; // set by auth middleware

    /* ────────────────────────────────────────────────
       1) Fetch enrolments → get all courses registered
    ──────────────────────────────────────────────────*/
    const enrolments = await Enrollment.find({ user: userId })
      .populate({
        path: 'course',
        select: 'title duration modules coverImage',
      })
      .lean();

    // If the user is not enrolled in anything, bail out early
    if (!enrolments.length) {
      return res
        .status(404)
        .json({ message: 'User is not enrolled in any courses' });
    }

    /* ────────────────────────────────────────────────
       2) Fetch progress docs for this user
    ──────────────────────────────────────────────────*/
    const progressDocs = await Progress.find({ user: userId }).lean();

    // Map <courseId, progressDoc>
    const progressMap = new Map(
      progressDocs.map((p) => [p.course.toString(), p])
    );

    /* ────────────────────────────────────────────────
       3) Build summary for every enrolled course
    ──────────────────────────────────────────────────*/
    const summaries = enrolments.map((enrol) => {
      const course = enrol.course;
      const prog = progressMap.get(course._id.toString()); // may be undefined

      // Course totals
      const totalModules = course.modules.length;
      const totalLessons = course.modules.reduce(
        (sum, m) => sum + m.lessons.length,
        0
      );

      // Completed counts (0 if no progress yet)
      const completedModules = prog ? prog.completedModules.length : 0;
      const completedLessons = prog
        ? prog.completedModules.reduce(
            (sum, m) => sum + m.completedLessons.length,
            0
          )
        : 0;

      const modulePercent = totalModules
        ? Math.round((completedModules / totalModules) * 100)
        : 0;
      const lessonPercent = totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

      return {
        courseId: course._id,
        courseTitle: course.title,
        duration: course.duration,
        coverImage: course.coverImage,
        isCompleted: prog?.isCompleted || false,
        certificateUrl: prog?.certificateUrl || null,
        progress: {
          modules: { completed: completedModules, total: totalModules, percent: modulePercent },
          lessons: { completed: completedLessons, total: totalLessons, percent: lessonPercent },
        },
        updatedAt: prog?.updatedAt || null,
      };
    });

    return res
      .status(200)
      .json({ message: 'User course progress summary', data: summaries });
  } catch (err) {
    console.error('Progress summary error →', err);
    return res
      .status(500)
      .json({ message: 'Failed to fetch progress summary', error: err });
  }
};


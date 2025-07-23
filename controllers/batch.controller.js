const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const User = require('../models/User');
const moment = require('moment');
const sendEmail = require('../utils/sendAdminBatchCompletionReminder'); // utility you use for mailing
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;




const fs = require('fs');
const path = require('path');
const { generateCertificate } = require('../utils/certificateGenerator');
const generateCertificateId = require('../utils/generateCertificateId');
const uploadCertificateToCloudinary = require('../utils/uploadCertificateToCloudinary');
const sendCertificateMail = require('../utils/sendCertificateMail');






exports.createBatch = async (req, res) => {
  try {
    const { batchName, course, users, professor, startDate, endDate } = req.body;

    const courseDoc = await Course.findById(course);
    if (!courseDoc) return res.status(404).json({ message: 'Course not found' });

    const totalLessons = courseDoc.modules.flatMap(m => m.lessons).length;

    const batch = new Batch({
      batchName, course, users, professor, startDate, endDate,
      batchProgress: {
        completedModules: [],
        completedLessons: [],
        percentage: 0
      }
    });

    await batch.save();
    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (error) {
    res.status(500).json({ message: 'Error creating batch', error });
  }
};

// exports.getAllBatches = async (req, res) => {
//   try {
//     const batches = await Batch.find()
//       .populate('course')
//       .populate('professor')
//       .populate('users')
//       .lean(); // Convert Mongoose docs to plain JS objects

//     const enrichedBatches = [];

//     for (const batch of batches) {
//       const course = batch.course;
//       if (!course) continue;

//       // Build maps for lookup
//       const moduleMap = {};
//       const lessonMap = {};
//       const topicMap = {};

//       course.modules.forEach(mod => {
//         const modId = mod._id.toString();
//         moduleMap[modId] = {
//           _id: mod._id,
//           title: mod.moduleTitle,
//           description: mod.moduleDescription,
//           completedLessons: []
//         };

//         mod.lessons.forEach(les => {
//           const lesId = les._id.toString();
//           lessonMap[lesId] = {
//             _id: les._id,
//             title: les.title,
//             moduleId: modId,
//             completedTopics: []
//           };

//           les.topics.forEach(top => {
//             topicMap[top._id.toString()] = {
//               _id: top._id,
//               title: top.title,
//               lessonId: lesId
//             };
//           });
//         });
//       });

//       // Get all lesson IDs in the course
//       const allLessonIds = Object.keys(lessonMap);
//       const completedLessons = batch.batchProgress?.completedLessons || [];
//       const completedTopics = batch.batchProgress?.completedTopics || [];

//       // Filter valid lessons
//       const validCompletedLessonIds = completedLessons.filter(id => allLessonIds.includes(id.toString()));
//       const uniqueCompletedLessonIds = [...new Set(validCompletedLessonIds.map(id => id.toString()))];

//       const percentage = allLessonIds.length === 0
//         ? 0
//         : Math.round((uniqueCompletedLessonIds.length / allLessonIds.length) * 100);

//       // Group topics into lessons
//       completedTopics.forEach(topicId => {
//         const topic = topicMap[topicId.toString()];
//         if (topic && lessonMap[topic.lessonId]) {
//           lessonMap[topic.lessonId].completedTopics.push({
//             _id: topic._id,
//             title: topic.title
//           });
//         }
//       });

//       // Group lessons into modules
//       uniqueCompletedLessonIds.forEach(lessonId => {
//         const lesson = lessonMap[lessonId];
//         if (lesson && moduleMap[lesson.moduleId]) {
//           moduleMap[lesson.moduleId].completedLessons.push({
//             _id: lesson._id,
//             title: lesson.title,
//             completedTopics: lesson.completedTopics
//           });
//         }
//       });

//       // Group modules
//       const completedModules = (batch.batchProgress?.completedModules || []).map(moduleId => {
//         const mod = moduleMap[moduleId.toString()];
//         if (mod) {
//           return {
//             _id: mod._id,
//             title: mod.title,
//             description: mod.description,
//             completedLessons: mod.completedLessons
//           };
//         }
//         return null;
//       }).filter(Boolean);

//       // Add enriched batch progress
//       enrichedBatches.push({
//         ...batch,
//         batchProgress: {
//           completedModules,
//           percentage
//         }
//       });
//     }

//     res.status(200).json({ batches: enrichedBatches });
//   } catch (error) {
//     console.error('Error fetching batches:', error);
//     res.status(500).json({ message: 'Error fetching batches', error });
//   }
// };


exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('course')
      .populate('professor')
      .populate('users')
      .populate('quizzes')
      .populate('events')
      .lean(); // Convert Mongoose docs to plain JS objects

    const enrichedBatches = [];

    for (const batch of batches) {
      const course = batch.course;
      if (!course || !Array.isArray(course.modules)) continue;

      // Build lookup maps
      const moduleMap = {};
      const lessonMap = {};
      const topicMap = {};

      course.modules.forEach(mod => {
        const modId = mod._id.toString();
        moduleMap[modId] = {
          _id: mod._id,
          title: mod.moduleTitle,
          description: mod.moduleDescription,
          completedLessons: []
        };

        if (!Array.isArray(mod.lessons)) return;
        mod.lessons.forEach(les => {
          const lesId = les._id.toString();
          lessonMap[lesId] = {
            _id: les._id,
            title: les.title,
            moduleId: modId,
            completedTopics: []
          };

          if (!Array.isArray(les.topics)) return;
          les.topics.forEach(top => {
            topicMap[top._id.toString()] = {
              _id: top._id,
              title: top.title,
              lessonId: lesId
            };
          });
        });
      });

      const allLessonIds = Object.keys(lessonMap);
      const completedLessons = batch.batchProgress?.completedLessons || [];
      const completedTopics = batch.batchProgress?.completedTopics || [];

      const validCompletedLessonIds = completedLessons.filter(id =>
        allLessonIds.includes(id.toString())
      );
      const uniqueCompletedLessonIds = [...new Set(validCompletedLessonIds.map(id => id.toString()))];

      const percentage = allLessonIds.length === 0
        ? 0
        : Math.round((uniqueCompletedLessonIds.length / allLessonIds.length) * 100);

      // Group topics into their respective lessons
      completedTopics.forEach(topicId => {
        const topic = topicMap[topicId.toString()];
        if (topic && lessonMap[topic.lessonId]) {
          lessonMap[topic.lessonId].completedTopics.push({
            _id: topic._id,
            title: topic.title
          });
        }
      });

      // Group lessons into modules
      uniqueCompletedLessonIds.forEach(lessonId => {
        const lesson = lessonMap[lessonId];
        if (lesson && moduleMap[lesson.moduleId]) {
          moduleMap[lesson.moduleId].completedLessons.push({
            _id: lesson._id,
            title: lesson.title,
            completedTopics: lesson.completedTopics
          });
        }
      });

      // Group completed modules
      const completedModuleIds = batch.batchProgress?.completedModules || [];
      const completedModules = completedModuleIds.map(moduleId => {
        const mod = moduleMap[moduleId.toString()];
        return mod
          ? {
              _id: mod._id,
              title: mod.title,
              description: mod.description,
              completedLessons: mod.completedLessons
            }
          : null;
      }).filter(Boolean);

      enrichedBatches.push({
        ...batch,
        batchProgress: {
          completedModules,
          percentage
        }
      });
    }

    res.status(200).json({ batches: enrichedBatches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Error fetching batches', error: error.message || error });
  }
};



// Get batch by ID with progress tracking
// exports.getBatchById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const batch = await Batch.findById(id)
//       .populate('course')
//       .populate('users', 'name email')
//       .populate('professor', 'name email')
//       .lean();

//     if (!batch) return res.status(404).json({ message: 'Batch not found' });

//     const { batchProgress, course } = batch;

//     const moduleMap = {};
//     const lessonMap = {};
//     const topicMap = {};

//     // Build Maps for lookup
//     course.modules.forEach(mod => {
//       const modId = mod._id.toString();
//       moduleMap[modId] = {
//         _id: mod._id,
//         title: mod.moduleTitle,
//         description: mod.moduleDescription,
//         completedLessons: []
//       };

//       mod.lessons.forEach(les => {
//         const lesId = les._id.toString();
//         lessonMap[lesId] = {
//           _id: les._id,
//           title: les.title,
//           moduleId: modId,
//           completedTopics: []
//         };

//         les.topics.forEach(top => {
//           topicMap[top._id.toString()] = {
//             _id: top._id,
//             title: top.title,
//             lessonId: lesId
//           };
//         });
//       });
//     });

//     // Group completedTopics into their lessons
//     batchProgress.completedTopics.forEach(topicId => {
//       const topic = topicMap[topicId.toString()];
//       if (topic) {
//         const lesson = lessonMap[topic.lessonId];
//         if (lesson) {
//           lesson.completedTopics.push({
//             _id: topic._id,
//             title: topic.title
//           });
//         }
//       }
//     });

//     // Group completedLessons into their modules
//     batchProgress.completedLessons.forEach(lessonId => {
//       const lesson = lessonMap[lessonId.toString()];
//       if (lesson) {
//         moduleMap[lesson.moduleId].completedLessons.push({
//           _id: lesson._id,
//           title: lesson.title,
//           completedTopics: lesson.completedTopics || []
//         });
//       }
//     });

//     // Get only completed modules with nested lessons & topics
//     const populatedModules = batchProgress.completedModules.map(moduleId => {
//       const module = moduleMap[moduleId.toString()];
//       if (module) {
//         return {
//           _id: module._id,
//           title: module.title,
//           description: module.description,
//           completedLessons: module.completedLessons || []
//         };
//       }
//       return null;
//     }).filter(Boolean); // remove nulls

//     batch.batchProgress = {
//       completedModules: populatedModules,
//       percentage: batchProgress.percentage
//     };

//     res.status(200).json({
//       message: 'Batch fetched successfully',
//       batch
//     });
//   } catch (error) {
//     console.error('Error fetching batch by ID:', error); // ✅ Add this to see real error
//     res.status(500).json({ message: 'Error fetching batch', error: error.message || error });
//   }
// };

exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id)
      .populate({
        path: 'course',
        populate: {
          path: 'modules',
          populate: {
            path: 'lessons',
            populate: { path: 'topics' },
          },
        },
      })
      .populate('professor')
      .populate('users');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const courseModules = batch.course?.modules || [];
    let totalLessons = 0;
    courseModules.forEach((mod) => {
      if (mod.lessons && Array.isArray(mod.lessons)) {
        totalLessons += mod.lessons.length;
      }
    });

    let completedLessons = 0;
    if (batch.progress && Array.isArray(batch.progress)) {
      batch.progress.forEach((moduleProgress) => {
        if (moduleProgress.completedLessons && Array.isArray(moduleProgress.completedLessons)) {
          completedLessons += moduleProgress.completedLessons.length;
        }
      });
    }

    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    res.status(200).json({
      message: 'Batch fetched successfully',
      batch,
      progress: {
        totalLessons,
        completedLessons,
        percentage: progressPercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching batch by ID:', error);
    res.status(500).json({
      message: 'Error fetching batch',
      error: error.message || error,
    });
  }
};



// Update batch with progress tracking
exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batchName,
      course,
      users,
      professor,
      startDate,
      endDate,
      quizzes,
      events,
      completedModules = [],
      completedLessons = [],
      completedTopics = [],
      markAsCompleted = false
    } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const courseDoc = await Course.findById(course || batch.course).lean();
    if (!courseDoc) return res.status(404).json({ message: 'Course not found' });

    // ✅ Count total lessons across all modules
    const allLessons = [];
    courseDoc.modules.forEach(mod => {
      mod.lessons.forEach(les => {
        allLessons.push(les._id.toString());
      });
    });

    const totalLessons = allLessons.length;

    const completedLessonIds = completedLessons.map(id => id.toString());
    const uniqueCompletedLessons = [...new Set(completedLessonIds.filter(id => allLessons.includes(id)))];

    const percentage = totalLessons === 0 ? 0 : Math.round((uniqueCompletedLessons.length / totalLessons) * 100);

    // ✅ Update batch fields
    batch.batchName = batchName || batch.batchName;
    batch.course = course || batch.course;
    batch.users = users || batch.users;
    batch.professor = professor || batch.professor;
    batch.startDate = startDate || batch.startDate;
    batch.endDate = endDate || batch.endDate;
    batch.quizzes = quizzes || batch.quizzes;
    batch.events = events || batch.events;

    batch.batchProgress = {
      completedModules,
      completedLessons: uniqueCompletedLessons,
      completedTopics,
      percentage
    };

    // ✅ Mark as completed and send email
    // ✅ Handle course completion toggle
    if (markAsCompleted && !batch.courseCompleted) {
      // ✅ Mark as completed
      batch.courseCompleted = true;
      batch.courseCompletedAt = new Date();

      const adminEmail = process.env.ADMIN_EMAIL || ADMIN_EMAIL;

      await sendEmail(
        adminEmail,
        `${batch.batchName}`,
        `${courseDoc.title}`,  // FIXED: using courseDoc, not batch.course
        `${batch.users.length}`
      );
    } else if (!markAsCompleted && batch.courseCompleted) {
      // ❌ Unmark as completed
      batch.courseCompleted = false;
      batch.courseCompletedAt = null;
    }
    // ✅ Save the batch

    await batch.save();

    // ✅ Create nested structure response
    const moduleMap = {};
    const lessonMap = {};
    const topicMap = {};

    courseDoc.modules.forEach(mod => {
      const modId = mod._id.toString();
      moduleMap[modId] = {
        _id: mod._id,
        title: mod.moduleTitle,
        description: mod.moduleDescription,
        completedLessons: []
      };

      mod.lessons.forEach(les => {
        const lesId = les._id.toString();
        lessonMap[lesId] = {
          _id: les._id,
          title: les.title,
          moduleId: modId,
          completedTopics: []
        };

        les.topics.forEach(top => {
          topicMap[top._id.toString()] = {
            _id: top._id,
            title: top.title,
            lessonId: lesId
          };
        });
      });
    });

    // ✅ Assign completed topics to lessons
    completedTopics.forEach(topicId => {
      const topic = topicMap[topicId.toString()];
      if (topic && lessonMap[topic.lessonId]) {
        lessonMap[topic.lessonId].completedTopics.push({
          _id: topic._id,
          title: topic.title
        });
      }
    });

    // ✅ Assign completed lessons to modules
    uniqueCompletedLessons.forEach(lessonId => {
      const lesson = lessonMap[lessonId.toString()];
      if (lesson && moduleMap[lesson.moduleId]) {
        moduleMap[lesson.moduleId].completedLessons.push({
          _id: lesson._id,
          title: lesson.title,
          completedTopics: lesson.completedTopics
        });
      }
    });

    // ✅ Prepare completedModules for response
    const populatedModules = completedModules.map(moduleId => {
      const mod = moduleMap[moduleId.toString()];
      if (mod) {
        return {
          _id: mod._id,
          title: mod.title,
          description: mod.description,
          completedLessons: mod.completedLessons
        };
      }
      return null;
    }).filter(Boolean);

    const responseBatch = batch.toObject();
    responseBatch.batchProgress = {
      completedModules: populatedModules,
      percentage
    };

    res.status(200).json({
      message: 'Batch updated successfully',
      batch: responseBatch
    });

  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ message: 'Error updating batch', error });
  }
};




exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Batch not found' });

    res.status(200).json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error });
  }
};

exports.getBatchStats = async (req, res) => {
  try {
    const [total, active, completed, allBatches] = await Promise.all([
      Batch.countDocuments(),
      Batch.countDocuments({ isActive: true }),
      Batch.countDocuments({ courseCompleted: true }),
      Batch.find({})
        .populate("users", "name email role")
        .populate("course", "title")
        .populate("professor", "name")
        .lean()
    ]);

    // ✅ Graph Data: Batches Created per Month
    const creationGraph = {};
    allBatches.forEach(batch => {
      const createdAt = moment(batch.createdAt).format("YYYY-MM");
      creationGraph[createdAt] = (creationGraph[createdAt] || 0) + 1;
    });

    // ✅ Graph Data: Completed Batches per Month
    const completedGraph = {};
    allBatches.forEach(batch => {
      if (batch.courseCompletedAt) {
        const completedMonth = moment(batch.courseCompletedAt).format("YYYY-MM");
        completedGraph[completedMonth] = (completedGraph[completedMonth] || 0) + 1;
      }
    });

    // ✅ Top 5 Batches by User Count
    const topBatches = [...allBatches]
      .sort((a, b) => b.users.length - a.users.length)
      .slice(0, 5)
      .map(batch => ({
        batchName: batch.batchName,
        courseTitle: batch.course?.title || "N/A",
        userCount: batch.users.length,
        progress: batch.batchProgress?.percentage || 0
      }));

    // ✅ Detailed Batch Info
    const detailedBatches = allBatches.map(batch => ({
      id: batch._id,
      batchName: batch.batchName,
      course: batch.course?.title || "N/A",
      professor: batch.professor?.name || "N/A",
      users: batch.users.map(u => ({ name: u.name, email: u.email, role: u.role })),
      startDate: batch.startDate,
      endDate: batch.endDate,
      isActive: batch.isActive,
      courseCompleted: batch.courseCompleted,
      percentage: batch.batchProgress?.percentage || 0
    }));

    res.status(200).json({
      summary: {
        totalBatches: total,
        activeBatches: active,
        completedBatches: completed
      },
      graphData: {
        batchesCreatedMonthly: creationGraph,
        batchesCompletedMonthly: completedGraph
      },
      topBatches,
      detailedBatches
    });
  } catch (error) {
    console.error("Error fetching batch stats:", error);
    res.status(500).json({ message: "Error fetching batch stats", error });
  }
};
















// Send certificate emails to selected users
exports.sendBatchCertificates = async (req, res) => {
  try {
    const { batchId } = req.body;

    // Step 1: Get batch, course, and users
    const batch = await Batch.findById(batchId).populate('users course');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const { users, course } = batch;
    if (!users.length) return res.status(400).json({ message: 'No users in batch' });
    if (!course) return res.status(400).json({ message: 'Course not associated with batch' });

    // Step 2: Loop through users
    for (const user of users) {
      const certId = generateCertificateId();

      // Generate PDF Buffer
      const pdfBuffer = await generateCertificate({
        userName: user.name,
        courseTitle: course.title,
      });

      // Save PDF temporarily to disk
      const tempFilePath = path.join(__dirname, `../temp/${certId}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);

      // Upload to Cloudinary
      const certUrl = await uploadCertificateToCloudinary(tempFilePath, `${certId}.pdf`);

      // Save progress update
      await Progress.findOneAndUpdate(
        { user: user._id, course: course._id },
        {
          isCompleted: true,
          completedAt: new Date(),
          certificateUrl: certUrl,
          certificateId: certId
        },
        { new: true, upsert: true }
      );

      // Send fancy email with certificate
      await sendCertificateMail({
        to: user.email,
        name: user.name,
        courseTitle: course.title,
        certUrl,
        certId
      });
    }

    return res.status(200).json({
      message: `Certificates successfully sent to all ${users.length} users in batch "${batch.batchName}"`,
      courseTitle: course.title,
    });
  } catch (error) {
    console.error('Error sending certificates:', error);
    return res.status(500).json({ message: 'Error sending certificates', error });
  }
};








exports.getAvailableUsersForBatch = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Step 1: Find the course and its enrolled users
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrolledUserIds = course.enrolledUsers;

    // Step 2: Get users already assigned to a batch of this course
    const batches = await Batch.find({ course: courseId }, 'users');
    const assignedUserIds = batches.flatMap(batch => batch.users.map(id => id.toString()));

    // Step 3: Filter users who are enrolled but not yet assigned to any batch
    const unassignedUserIds = enrolledUserIds.filter(
      userId => !assignedUserIds.includes(userId.toString())
    );

    // Step 4: Fetch full user details of the unassigned users
    const unassignedUsers = await User.find({ _id: { $in: unassignedUserIds } }, 'name email');

    res.status(200).json({
      courseId,
      courseTitle: course.title,
      totalEnrolled: enrolledUserIds.length,
      alreadyAssigned: assignedUserIds.length,
      availableUsers: unassignedUsers.length,
      users: unassignedUsers
    });

  } catch (error) {
    console.error("Error fetching available users for batch:", error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};


exports.getBatchUserBreakdown = async (req, res) => {
  try {
    const { courseId, batchId } = req.params;

    // Step 1: Fetch the course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrolledUserIds = course.enrolledUsers.map(id => id.toString());

    // Step 2: Fetch all batches of this course
    const allBatches = await Batch.find({ course: courseId });

    const assignedUserMap = new Map(); // userId -> batchId
    for (const batch of allBatches) {
      for (const userId of batch.users) {
        assignedUserMap.set(userId.toString(), batch._id.toString());
      }
    }

    // Step 3: Classify users
    const assignedToThisBatch = [];
    const assignedToOtherBatches = [];
    const unassignedUsers = [];

    for (const userId of enrolledUserIds) {
      const assignedBatchId = assignedUserMap.get(userId);

      if (!assignedBatchId) {
        unassignedUsers.push(userId);
      } else if (assignedBatchId === batchId) {
        assignedToThisBatch.push(userId);
      } else {
        assignedToOtherBatches.push(userId);
      }
    }

    // Step 4: Fetch full user details
    const [usersThisBatch, usersOtherBatches, usersAvailable] = await Promise.all([
      User.find({ _id: { $in: assignedToThisBatch } }, 'name email'),
      User.find({ _id: { $in: assignedToOtherBatches } }, 'name email'),
      User.find({ _id: { $in: unassignedUsers } }, 'name email')
    ]);

    res.status(200).json({
      courseId,
      courseTitle: course.title,
      totalEnrolled: enrolledUserIds.length,
      batchId,
      breakdown: {
        assignedToThisBatch: {
          count: usersThisBatch.length,
          users: usersThisBatch
        },
        assignedToOtherBatches: {
          count: usersOtherBatches.length,
          users: usersOtherBatches
        },
        availableUsers: {
          count: usersAvailable.length,
          users: usersAvailable
        }
      }
    });
  } catch (error) {
    console.error("Error fetching batch user breakdown:", error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};



exports.getBatchesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch batches started between given dates
    const batches = await Batch.find({
      startDate: { $gte: start, $lte: end },
    });

    // Group batches by month
    const monthCounts = {};

    batches.forEach((batch) => {
      const monthKey = moment(batch.startDate).format('YYYY-MM');
      if (!monthCounts[monthKey]) {
        monthCounts[monthKey] = 0;
      }
      monthCounts[monthKey]++;
    });

    // Format for chart-friendly structure
    const formatted = Object.entries(monthCounts).map(([month, count]) => ({
      month,
      count,
    }));

    res.status(200).json({
      message: `Batch count by month from ${startDate} to ${endDate}`,
      totalBatches: batches.length,
      data: formatted, // For graphs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly batch stats', error });
  }
};

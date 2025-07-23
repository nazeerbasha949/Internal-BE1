const Course = require('../models/Course');
const Batch = require('../models/Batch');
const User = require('../models/User');
const Progress = require('../models/Progress'); // 👈 Add this line
const sendEmail = require('../utils/sendAdminBatchCompletionReminder'); // Make sure this is the correct path
const Notification = require('../models/Notification');

exports.createBatch = async (req, res) => {
  try {
    const { batchName, course, users, professor, startDate, endDate } = req.body;

    // Fetch the course to get enrolled users
    const courseData = await Course.findById(course);
    if (!courseData) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Filter out only users who are enrolled in this course
    const validUsers = users.filter(userId =>
      courseData.enrolledUsers.includes(userId)
    );

    // If no valid users found
    if (validUsers.length === 0) {
      return res.status(400).json({ message: 'No selected users are enrolled in this course' });
    }

    // Create batch only with enrolled users
    const batch = await Batch.create({
      batchName,
      course,
      users: validUsers,
      professor,
      startDate,
      endDate
    });

    res.status(201).json({ message: 'Batch created with enrolled users only', batch });
  } catch (error) {
    console.error("Batch creation failed →", error);
    res.status(500).json({ message: 'Error creating batch', error });
  }
};

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('course')
      .populate('users', 'name email')
      .populate('professor', 'name email')
      .lean();

    const enrichedBatches = [];

    for (const batch of batches) {
      if (!batch.course || !batch.users) {
        console.warn(`Skipping batch ${batch._id} due to missing course or users`);
        continue;
      }

      const course = batch.course;
      const users = batch.users;

      const totalModules = course.modules?.length || 0;
      const totalLessons = course.modules?.reduce(
        (sum, mod) => sum + (mod.lessons?.length || 0),
        0
      ) || 0;

      const userProgressDetails = [];

      for (const user of users) {
        try {
          const progress = await Progress.findOne({ user: user._id, course: course._id }).lean();

          const completedModules = progress?.completedModules?.length || 0;
          const completedLessons = progress?.completedModules?.reduce(
            (sum, mod) => sum + (mod.completedLessons?.length || 0),
            0
          ) || 0;

          const modulePercent = totalModules
            ? Math.round((completedModules / totalModules) * 100)
            : 0;
          const lessonPercent = totalLessons
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

          userProgressDetails.push({
            userId: user._id,
            name: user.name,
            email: user.email,
            isCompleted: progress?.isCompleted || false,
            certificateUrl: progress?.certificateUrl || null,
            updatedAt: progress?.updatedAt || null,
            progress: {
              modules: {
                completed: completedModules,
                total: totalModules,
                percent: modulePercent
              },
              lessons: {
                completed: completedLessons,
                total: totalLessons,
                percent: lessonPercent
              }
            }
          });
        } catch (innerErr) {
          console.error(`Progress error for user ${user._id} in course ${course._id}:`, innerErr);
        }
      }

      enrichedBatches.push({
        batchId: batch._id,
        batchName: batch.batchName,
        startDate: batch.startDate,
        endDate: batch.endDate,
        createdAt: batch.createdAt,
        course: {
          id: course._id,
          title: course.title,
          duration: course.duration,
          level: course.level,
          type: course.type,
          category: course.category
        },
        professor: batch.professor || null,
        totalUsers: users.length,
        users: userProgressDetails
      });
    }

    return res.status(200).json({
      message: "All batch details with user progress",
      data: enrichedBatches
    });
  } catch (error) {
    console.error("❌ Error fetching batches →", error);
    res.status(500).json({ message: 'Error fetching batches', error: error.message || error });
  }
};


exports.assignQuizToBatch = async (req, res) => {
  try {
    const { batchId, quiz } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    batch.quizzes.push(quiz);
    await batch.save();

    res.status(200).json({ message: 'Quiz assigned', batch });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning quiz', error });
  }
};


// Get single batch
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate({
        path: 'course',
        populate: {
          path: 'modules.lessons.topics', // Ensure all levels are populated
        }
      })
      .populate('users', 'name email')
      .populate('professor');

    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const course = batch.course;
    const moduleCount = course.modules?.length || 0;
    const totalUsers = batch.users.length;

    // Prepare title and lookup maps
    const moduleMap = {};
    const lessonMap = {};
    const topicMap = {};
    const lessonToTopicMap = {};

    for (const module of course.modules) {
      moduleMap[module._id.toString()] = module.moduleTitle;
      for (const lesson of module.lessons || []) {
        lessonMap[lesson._id.toString()] = lesson.title;
        lessonToTopicMap[lesson._id.toString()] = []; // Init topic list

        for (const topic of lesson.topics || []) {
          topicMap[topic._id.toString()] = topic.title;
          lessonToTopicMap[lesson._id.toString()].push(topic._id.toString());
        }
      }
    }


    const lessonCount = course.modules.reduce(
      (acc, mod) => acc + (mod.lessons?.length || 0), 0
    );

    let totalCompletedModules = 0;
    let totalCompletedLessons = 0;

    const aggregatedDetailedProgress = {};

    const usersWithProgress = await Promise.all(
      batch.users.map(async user => {
        try {
          const progress = await Progress.findOne({ user: user._id, course: course._id });

          const completedModules = progress?.completedModules?.length || 0;
          // Step 1: Collect all completed lessonIds into a Set to avoid duplicates
          const completedLessonSet = new Set();

          (progress?.completedModules || []).forEach(mod => {
            (mod.completedLessons || []).forEach(les => {
              completedLessonSet.add(les.lessonId.toString());
            });
          });

          const completedLessons = completedLessonSet.size; // accurate count


          totalCompletedModules += completedModules;
          totalCompletedLessons += completedLessons;

          // Enhance detailed with titles
          const detailedProgress = (progress?.completedModules || []).map(mod => ({
            moduleId: mod.moduleId,
            moduleTitle: moduleMap[mod.moduleId] || '',
            completedLessons: (mod.completedLessons || []).map(les => ({
              lessonId: les.lessonId,
              lessonTitle: lessonMap[les.lessonId] || '',
              completedTopics: progress?.isCompleted
                ? (lessonToTopicMap[les.lessonId] || []).map(tid => ({
                  topicId: tid,
                  topicTitle: topicMap[tid] || ''
                }))
                : (les.completedTopics || []).map(tid => ({
                  topicId: tid,
                  topicTitle: topicMap[tid] || ''
                }))


            }))
          }));

          // Aggregate batch progress
          for (const mod of detailedProgress) {
            if (!aggregatedDetailedProgress[mod.moduleId]) {
              aggregatedDetailedProgress[mod.moduleId] = {
                moduleTitle: mod.moduleTitle,
                completedLessons: {}
              };
            }

            for (const les of mod.completedLessons) {
              if (!aggregatedDetailedProgress[mod.moduleId].completedLessons[les.lessonId]) {
                aggregatedDetailedProgress[mod.moduleId].completedLessons[les.lessonId] = {
                  lessonTitle: les.lessonTitle,
                  completedTopics: []
                };
              }

              aggregatedDetailedProgress[mod.moduleId].completedLessons[les.lessonId].completedTopics.push(
                ...les.completedTopics.map(t => t.topicId)
              );
            }
          }

          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            isCompleted: progress?.isCompleted || false,
            certificateUrl: progress?.certificateUrl || null,
            updatedAt: progress?.updatedAt || null,
            progress: {
              modules: {
                completed: completedModules,
                total: moduleCount,
                percent: moduleCount ? Math.round((completedModules / moduleCount) * 100) : 0
              },
              lessons: {
                completed: completedLessons,
                total: lessonCount,
                percent: lessonCount ? Math.round((completedLessons / lessonCount) * 100) : 0
              },
              detailed: detailedProgress
            }
          };
        } catch (err) {
          console.error(`Progress fetch error for user ${user._id} →`, err);
          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            isCompleted: false,
            certificateUrl: null,
            progress: null
          };
        }
      })
    );

    // Construct detailed batch progress with titles
    const detailedBatchProgress = Object.entries(aggregatedDetailedProgress).map(
      ([moduleId, moduleData]) => {
        const completedLessons = Object.entries(moduleData.completedLessons).map(
          ([lessonId, lessonData]) => ({
            lessonId,
            lessonTitle: lessonData.lessonTitle,
            completedTopics: [...new Set(lessonData.completedTopics)].map(topicId => ({
              topicId,
              topicTitle: topicMap[topicId] || ''
            }))
          })
        );
        return {
          moduleId,
          moduleTitle: moduleData.moduleTitle,
          completedLessons
        };
      }
    );

    const batchProgress = {
      modules: {
        completed: totalCompletedModules,
        total: totalUsers * moduleCount,
        percent:
          totalUsers && moduleCount
            ? Math.round((totalCompletedModules / (moduleCount)) * 100)
            : 0
      },
      lessons: {
        completed: totalCompletedLessons,
        total: totalUsers * lessonCount,
        percent:
          totalUsers && lessonCount
            ? Math.round((totalCompletedLessons / (lessonCount)) * 100)
            : 0
      },
      detailed: detailedBatchProgress
    };

    const courseCompleted = usersWithProgress.every((user) => user.isCompleted);

    res.status(200).json({
      message: 'Batch details with user and batch progress',
      batchId: batch._id,
      batchName: batch.batchName,
      startDate: batch.startDate,
      endDate: batch.endDate,
      professor: batch.professor,
      course: {
        id: course._id,
        title: course.title,
        duration: course.duration,
        coverImage: course.coverImage,
        modulesCount: moduleCount,
        lessonsCount: lessonCount
      },
      users: usersWithProgress,
      batchProgress,
      // courseCompleted, // 👈 Add this field to indicate if batch is complete
      courseCompleted: batch.courseCompleted, // ✅ include this field
      isActive: batch.isActive,

    });
  } catch (error) {
    console.error('Error fetching batch details →', error);
    res.status(500).json({ message: 'Error fetching batch details', error });
  }
};


// Update batch
// exports.updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       batchName,
//       professor,
//       course,
//       users,
//       startDate,
//       endDate,
//       quizzes,
//       events,
//       progressUpdates,
//       isCourseCompleted = false
//     } = req.body;

//     let batch = await Batch.findById(id);
//     if (!batch) return res.status(404).json({ message: 'Batch not found' });

//     if (batchName !== undefined) batch.batchName = batchName;
//     if (professor !== undefined) batch.professor = professor;
//     if (course !== undefined) batch.course = course;
//     if (users !== undefined) batch.users = users;
//     if (startDate !== undefined) batch.startDate = startDate;
//     if (endDate !== undefined) batch.endDate = endDate;
//     if (quizzes !== undefined) batch.quizzes = quizzes;
//     if (events !== undefined) batch.events = events;

//     const courseId = course || batch.course;

//     if (progressUpdates && Array.isArray(progressUpdates)) {
//       batch.progress = progressUpdates;

//       const courseDoc = await Course.findById(courseId).populate({
//         path: 'modules.lessons.topics'
//       });

//       const moduleMap = {};
//       for (const mod of courseDoc.modules) {
//         moduleMap[mod._id.toString()] = {};
//         for (const lesson of mod.lessons) {
//           moduleMap[mod._id.toString()][lesson._id.toString()] = lesson.topics.map((t) => ({
//             topicId: t._id
//           }));
//         }
//       }

//       for (const userId of batch.users) {
//         const normalizedProgress = progressUpdates.map((mod) => ({
//           moduleId: mod.moduleId,
//           completedLessons: (mod.completedLessons || []).map((lesson) => ({
//             lessonId: lesson.lessonId,
//             completedTopics: (lesson.completedTopics || [])
//               .filter((t) => t && (typeof t === 'string' || typeof t === 'object'))
//               .map((t) =>
//                 typeof t === 'string'
//                   ? { topicId: t }
//                   : t.topicId
//                     ? { topicId: t.topicId }
//                     : null
//               )
//               .filter(Boolean)
//               // fallback: if empty, fill from course
//               .concat(
//                 (!lesson.completedTopics || lesson.completedTopics.length === 0)
//                   ? moduleMap[mod.moduleId.toString()]?.[lesson.lessonId.toString()] || []
//                   : []
//               )
//           }))
//         }));

//         await Progress.findOneAndUpdate(
//           { user: userId, course: courseId },
//           {
//             completedModules: normalizedProgress,
//             ...(isCourseCompleted && {
//               isCompleted: true,
//               completedAt: new Date(),
//               certificateUrl: `/certificates/CERT-${userId}-${Date.now()}.pdf`
//             }),
//             $setOnInsert: {
//               user: userId,
//               course: courseId
//             }
//           },
//           { new: true, upsert: true }
//         );
//       }
//     }



//     await batch.save();

//     // 🔄 Automatically mark all users' progress as completed if course is marked completed
//     if (isCourseCompleted && (!progressUpdates || progressUpdates.length === 0)) {
//       const userIds = batch.users;
//       const courseDoc = await Course.findById(batch.course).populate({
//         path: 'modules.lessons.topics'
//       });

//       const fullProgress = courseDoc.modules.map((mod) => ({
//         moduleId: mod._id,
//         completedLessons: (mod.lessons || []).map((lesson) => ({
//           lessonId: lesson._id,
//           completedTopics: (lesson.topics || []).map((topic) => ({
//             topicId: topic._id
//           }))
//         }))
//       }));

//       await Promise.all(
//         userIds.map(async (userId) => {
//           await Progress.findOneAndUpdate(
//             { user: userId, course: courseDoc._id },
//             {
//               completedModules: fullProgress,
//               isCompleted: true,
//               completedAt: new Date(),
//               certificateUrl: `/certificates/CERT-${userId}-${Date.now()}.pdf`,
//               $setOnInsert: {
//                 user: userId,
//                 course: courseDoc._id
//               }
//             },
//             { upsert: true, new: true }
//           );
//         })
//       );
//     }


//     // Fetch updated info
//     const enrichedBatch = await Batch.findById(batch._id)
//       .populate('course')
//       .populate('users', 'name email')
//       .populate('professor', 'name email')
//       .lean();

//     const courseIdFinal = enrichedBatch.course?._id;

//     const totalModules = enrichedBatch.course?.modules?.length || 0;
//     const totalLessons = enrichedBatch.course?.modules?.reduce(
//       (sum, mod) => sum + (mod.lessons?.length || 0),
//       0
//     );

//     const userProgressDetails = [];

//     for (const user of enrichedBatch.users) {
//       const progress = await Progress.findOne({ user: user._id, course: courseIdFinal }).lean();

//       const completedModules = progress?.completedModules?.length || 0;
//       const completedLessons = progress?.completedModules?.reduce(
//         (sum, mod) => sum + (mod.completedLessons?.length || 0),
//         0
//       );

//       userProgressDetails.push({
//         userId: user._id,
//         name: user.name,
//         email: user.email,
//         isCompleted: progress?.isCompleted || false,
//         certificateUrl: progress?.certificateUrl || null,
//         updatedAt: progress?.updatedAt || null,
//         progress: {
//           modules: {
//             completed: completedModules,
//             total: totalModules,
//             percent: totalModules ? Math.round((completedModules / totalModules) * 100) : 0
//           },
//           lessons: {
//             completed: completedLessons,
//             total: totalLessons,
//             percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
//           },
//           detailed: progress?.completedModules || []  // 👈 Include detailed structure
//         }
//       });
//     }

//     // 🎯 Send email + notification to admin if course is completed
//     if (isCourseCompleted) {
//       try {
//         const adminEmail = process.env.ADMIN_EMAIL;
//         if (!adminEmail) throw new Error('Admin email not defined in environment variables');

//         const subject = `🎓 Certificates Pending: ${enrichedBatch.batchName}`;
//         const html = `
//           <div style="font-family: 'Segoe UI', sans-serif; padding: 20px;">
//             <h2 style="color: #00b894;">🚀 Course Completion Alert</h2>
//             <p>Hey Admin,</p>
//             <p><strong>${enrichedBatch.batchName}</strong> has completed the course <strong>${enrichedBatch.course.title}</strong>.</p>
//             <p>It's time to generate certificates for <strong>${enrichedBatch.users.length} interns</strong>.</p>
//             <a href="${process.env.ADMIN_DASHBOARD_URL || '#'}" style="padding: 10px 20px; background-color: #0984e3; color: #fff; text-decoration: none; border-radius: 5px;">Generate Certificates Now</a>
//             <br><br>
//             <p style="font-size: 14px; color: gray;">Sent from Signavox Career Ladder System</p>
//           </div>
//         `;

//         // await sendEmail(adminEmail, subject, html);
//         await sendEmail(adminEmail, `${enrichedBatch.batchName}`, `${enrichedBatch.course.title}`, `${enrichedBatch.users.length}`);

//         const adminUser = await User.findOne({ email: adminEmail });
//         if (adminUser) {
//           await Notification.create({
//             user: adminUser._id,
//             createdBy: null,
//             targetBatches: [batch._id],
//             title: `Generate certificates for ${enrichedBatch.batchName}`,
//             message: `The batch "${enrichedBatch.batchName}" has completed the course. Certificates are pending.`,
//             type: 'certificate',
//             link: `${process.env.ADMIN_DASHBOARD_URL || '#'}/certificates?batch=${batch._id}`
//           });
//         }
//       } catch (notifyErr) {
//         console.error('❌ Error sending admin certificate email/notification:', notifyErr);
//       }
//     }



//     return res.status(200).json({
//       message: 'Batch updated successfully with progress sync',
//       batchId: enrichedBatch._id,
//       batchName: enrichedBatch.batchName,
//       startDate: enrichedBatch.startDate,
//       endDate: enrichedBatch.endDate,
//       course: {
//         id: enrichedBatch.course?._id,
//         title: enrichedBatch.course?.title,
//         duration: enrichedBatch.course?.duration,
//         level: enrichedBatch.course?.level,
//         type: enrichedBatch.course?.type,
//         category: enrichedBatch.course?.category
//       },
//       professor: enrichedBatch.professor || null,
//       totalUsers: enrichedBatch.users.length,
//       users: userProgressDetails,
//       batchProgress: enrichedBatch.progress || [],

//       courseCompleted: isCourseCompleted
//     });
//   } catch (error) {
//     console.error('❌ Error updating batch:', error);
//     res.status(500).json({
//       message: 'Error updating batch',
//       error: error.message || error.toString()
//     });
//   }
// };

exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batchName,
      professor,
      course,
      users,
      startDate,
      endDate,
      quizzes,
      events,
      progressUpdates,
      isCourseCompleted = false
    } = req.body;

    let batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    if (batchName !== undefined) batch.batchName = batchName;
    if (professor !== undefined) batch.professor = professor;
    if (course !== undefined) batch.course = course;
    if (users !== undefined) batch.users = users;
    if (startDate !== undefined) batch.startDate = startDate;
    if (endDate !== undefined) batch.endDate = endDate;
    if (quizzes !== undefined) batch.quizzes = quizzes;
    if (events !== undefined) batch.events = events;

    const courseId = course || batch.course;

    if (progressUpdates && Array.isArray(progressUpdates)) {
      batch.progress = progressUpdates;

      const courseDoc = await Course.findById(courseId).populate({
        path: 'modules.lessons.topics'
      });

      const moduleMap = {};
      for (const mod of courseDoc.modules) {
        moduleMap[mod._id.toString()] = {};
        for (const lesson of mod.lessons) {
          moduleMap[mod._id.toString()][lesson._id.toString()] = lesson.topics.map((t) => ({
            topicId: t._id
          }));
        }
      }

      for (const userId of batch.users) {
        const normalizedProgress = progressUpdates.map((mod) => ({
          moduleId: mod.moduleId,
          completedLessons: (mod.completedLessons || []).map((lesson) => ({
            lessonId: lesson.lessonId,
            completedTopics: (lesson.completedTopics || [])
              .filter((t) => t && (typeof t === 'string' || typeof t === 'object'))
              .map((t) =>
                typeof t === 'string'
                  ? { topicId: t }
                  : t.topicId
                    ? { topicId: t.topicId }
                    : null
              )
              .filter(Boolean)
              .concat(
                (!lesson.completedTopics || lesson.completedTopics.length === 0)
                  ? moduleMap[mod.moduleId.toString()]?.[lesson.lessonId.toString()] || []
                  : []
              )
          }))
        }));

        await Progress.findOneAndUpdate(
          { user: userId, course: courseId },
          {
            completedModules: normalizedProgress,
            ...(isCourseCompleted && {
              isCompleted: true,
              completedAt: new Date(),
              certificateUrl: `/certificates/CERT-${userId}-${Date.now()}.pdf`
            }),
            $setOnInsert: {
              user: userId,
              course: courseId
            }
          },
          { new: true, upsert: true }
        );
      }
    }

    await batch.save();

    if (isCourseCompleted && (!progressUpdates || progressUpdates.length === 0)) {
      const userIds = batch.users;
      const courseDoc = await Course.findById(batch.course).populate({
        path: 'modules.lessons.topics'
      });

      const fullProgress = courseDoc.modules.map((mod) => ({
        moduleId: mod._id,
        completedLessons: (mod.lessons || []).map((lesson) => ({
          lessonId: lesson._id,
          completedTopics: (lesson.topics || []).map((topic) => ({
            topicId: topic._id
          }))
        }))
      }));

      await Promise.all(
        userIds.map(async (userId) => {
          await Progress.findOneAndUpdate(
            { user: userId, course: courseDoc._id },
            {
              completedModules: fullProgress,
              isCompleted: true,
              completedAt: new Date(),
              certificateUrl: `/certificates/CERT-${userId}-${Date.now()}.pdf`,
              $setOnInsert: {
                user: userId,
                course: courseDoc._id
              }
            },
            { upsert: true, new: true }
          );
        })
      );
    }

    const enrichedBatch = await Batch.findById(batch._id)
      .populate('course')
      .populate('users', 'name email')
      .populate('professor', 'name email')
      .lean();

    const courseIdFinal = enrichedBatch.course?._id;
    const totalModules = enrichedBatch.course?.modules?.length || 0;
    const totalLessons = enrichedBatch.course?.modules?.reduce(
      (sum, mod) => sum + (mod.lessons?.length || 0),
      0
    );

    const userProgressDetails = [];

    for (const user of enrichedBatch.users) {
      const progress = await Progress.findOne({ user: user._id, course: courseIdFinal }).lean();

      // 🧠 Deduplicate completed lesson IDs
      const lessonSet = new Set();
      (progress?.completedModules || []).forEach((mod) => {
        (mod.completedLessons || []).forEach((les) => {
          lessonSet.add(les.lessonId.toString());
        });
      });

      const completedModules = progress?.completedModules?.length || 0;
      const completedLessons = lessonSet.size;

      userProgressDetails.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        isCompleted: progress?.isCompleted || false,
        certificateUrl: progress?.certificateUrl || null,
        updatedAt: progress?.updatedAt || null,
        progress: {
          modules: {
            completed: completedModules,
            total: totalModules,
            percent: totalModules ? Math.round((completedModules / totalModules) * 100) : 0
          },
          lessons: {
            completed: completedLessons,
            total: totalLessons,
            percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
          },
          detailed: progress?.completedModules || []
        }
      });
    }

    // 📊 Calculate batchProgress
    let totalCompletedModules = 0;
    let totalCompletedLessons = 0;

    userProgressDetails.forEach((user) => {
      totalCompletedModules += user.progress.modules.completed;
      totalCompletedLessons += user.progress.lessons.completed;
    });

    const totalUsers = userProgressDetails.length;

    const batchProgress = {
      modules: {
        completed: totalCompletedModules,
        total: totalUsers * totalModules,
        percent:
          totalUsers && totalModules
            ? Math.round((totalCompletedModules / (totalUsers * totalModules)) * 100)
            : 0
      },
      lessons: {
        completed: totalCompletedLessons,
        total: totalUsers * totalLessons,
        percent:
          totalUsers && totalLessons
            ? Math.round((totalCompletedLessons / (totalUsers * totalLessons)) * 100)
            : 0
      },
      detailed: [] // Optional: populate if needed
    };

    if (isCourseCompleted) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) throw new Error('Admin email not defined in environment variables');

        const subject = `🎓 Certificates Pending: ${enrichedBatch.batchName}`;
        const html = `
          <div style="font-family: 'Segoe UI', sans-serif; padding: 20px;">
            <h2 style="color: #00b894;">🚀 Course Completion Alert</h2>
            <p>Hey Admin,</p>
            <p><strong>${enrichedBatch.batchName}</strong> has completed the course <strong>${enrichedBatch.course.title}</strong>.</p>
            <p>It's time to generate certificates for <strong>${enrichedBatch.users.length} interns</strong>.</p>
            <a href="${process.env.ADMIN_DASHBOARD_URL || '#'}" style="padding: 10px 20px; background-color: #0984e3; color: #fff; text-decoration: none; border-radius: 5px;">Generate Certificates Now</a>
            <br><br>
            <p style="font-size: 14px; color: gray;">Sent from Signavox Career Ladder System</p>
          </div>
        `;

        await sendEmail(adminEmail, `${enrichedBatch.batchName}`, `${enrichedBatch.course.title}`, `${enrichedBatch.users.length}`);

        const adminUser = await User.findOne({ email: adminEmail });
        if (adminUser) {
          await Notification.create({
            user: adminUser._id,
            createdBy: null,
            targetBatches: [batch._id],
            title: `Generate certificates for ${enrichedBatch.batchName}`,
            message: `The batch "${enrichedBatch.batchName}" has completed the course. Certificates are pending.`,
            type: 'certificate',
            link: `${process.env.ADMIN_DASHBOARD_URL || '#'}/certificates?batch=${batch._id}`
          });
        }
      } catch (notifyErr) {
        console.error('❌ Error sending admin certificate email/notification:', notifyErr);
      }
    }

    return res.status(200).json({
      message: 'Batch updated successfully with progress sync',
      batchId: enrichedBatch._id,
      batchName: enrichedBatch.batchName,
      startDate: enrichedBatch.startDate,
      endDate: enrichedBatch.endDate,
      course: {
        id: enrichedBatch.course?._id,
        title: enrichedBatch.course?.title,
        duration: enrichedBatch.course?.duration,
        level: enrichedBatch.course?.level,
        type: enrichedBatch.course?.type,
        category: enrichedBatch.course?.category
      },
      professor: enrichedBatch.professor || null,
      totalUsers,
      users: userProgressDetails,
      batchProgress,
      courseCompleted: isCourseCompleted,
      isActive: enrichedBatch.isActive
    });
  } catch (error) {
    console.error('❌ Error updating batch:', error);
    res.status(500).json({
      message: 'Error updating batch',
      error: error.message || error.toString()
    });
  }
};


// Delete batch
exports.deleteBatch = async (req, res) => {
  try {
    const deleted = await Batch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Batch not found' });
    res.status(200).json({ message: 'Batch deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error });
  }
};

// Send certificate emails to selected users
exports.sendBatchCertificates = async (req, res) => {
  try {
    const { userIds, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const users = await User.find({ _id: { $in: userIds } });

    for (const user of users) {
      // Simulate certificate generation
      const certUrl = `/certificates/CERT-${user._id}-${Date.now()}.pdf`;

      // Update user's progress
      await Progress.findOneAndUpdate(
        { user: user._id, course: courseId },
        { isCompleted: true, completedAt: new Date(), certificateUrl: certUrl },
        { new: true }
      );

      // Send fancy email
      await sendCertificateMail(user.email, user.name, course.title, certUrl);
    }

    res.status(200).json({ message: 'Certificates sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending certificates', error });
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


exports.markCourseCompleted = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    batch.courseCompleted = true;
    batch.courseCompletedAt = new Date(); // ✅ Track completion time
    await batch.save();

    res.status(200).json({ message: "Batch course marked as completed", batch });
  } catch (error) {
    res.status(500).json({ message: "Error completing course", error: error.message });
  }
};




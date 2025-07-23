// const mongoose = require('mongoose');

// const progressSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
//   enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },

//   completedModules: [{
//     moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule' },
//     completedLessons: [{
//       lessonId: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
//       completedTopics: [{ type: String }],
//       quizScore: Number,
//       feedback: String
//     }]
//   }],

//   courseFeedback: String,
//   isCompleted: { type: Boolean, default: false },
//   completedAt: Date,

//   certificateUrl: String,
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Progress', progressSchema);
const mongoose = require('mongoose');

const CompletedTopicSchema = new mongoose.Schema({
  type: String
}, { _id: false });

const CompletedLessonSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  completedTopics: [CompletedTopicSchema],
  quizScore: Number,
  feedback: String
}, { _id: false });

const CompletedModuleSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseModule' },
  completedLessons: [CompletedLessonSchema]
}, { _id: false });

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },

  completedModules: [CompletedModuleSchema],

  courseFeedback: String,
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,

  certificateUrl: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Progress', progressSchema);

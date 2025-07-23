const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  completedSubtopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubTopic' }],
  progressPercentage: { type: Number, default: 0 },
  currentModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  currentLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  currentSubtopic: { type: mongoose.Schema.Types.ObjectId, ref: 'SubTopic' },
  quizScores: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    score: Number,
    takenAt: Date
  }]
});

module.exports = mongoose.model('StudentProgress', studentProgressSchema);

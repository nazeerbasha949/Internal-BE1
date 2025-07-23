const mongoose = require('mongoose');

const batchProgressSchema = new mongoose.Schema({
  completedModules: [{ type: mongoose.Schema.Types.ObjectId }],
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
  completedTopics: [{ type: mongoose.Schema.Types.ObjectId }],
  percentage: { type: Number, default: 0 } // % based on total lessons
}, { _id: false });

const batchSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },

  quizzes: [
    {
      title: String,
      date: Date,
      details: String
    }
  ],
  events: [
    {
      title: String,
      description: String,
      date: Date
    }
  ],

  batchProgress: batchProgressSchema,

  courseCompleted: { type: Boolean, default: false },
  courseCompletedAt: { type: Date },
  isActive: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);

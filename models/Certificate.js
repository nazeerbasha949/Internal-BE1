const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  issuedAt: { type: Date, default: Date.now },
  score: Number,
  passed: { type: Boolean, default: true },
  downloadLink: String,
  validated: { type: Boolean, default: true },
});

module.exports = mongoose.model('Certificate', certificateSchema);

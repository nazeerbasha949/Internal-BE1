const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['Webinar', 'Workshop', 'Session', 'Hackathon', 'Seminar'] },
  date: { type: Date, required: true },
  startTime: String,
  endTime: String,
  location: String,
  mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
  bannerImage: String,
  speaker: {
    name: String,
    designation: String,
    photo: String,
    linkedIn: String
  },
  registrationRequired: { type: Boolean, default: true },
  maxAttendees: Number,
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);

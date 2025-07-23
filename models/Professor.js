const mongoose = require('mongoose');

const professorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  linkedIn: String,
  profileImage: String,
  bio: String,
  expertise: [String], // ['Web Development', 'AI']
  yearsOfExperience: Number,
  designation: String,
  currentOrganization: String,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Professor', professorSchema);

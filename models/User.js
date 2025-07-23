const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  generatedPassword: { type: String, select: false },
  role: { type: String, enum: ['intern', 'admin'], default: 'intern' },
  approveStatus: {
    type: String,
    enum: ['approved', 'rejected', 'waiting'],
    default: 'waiting'
  },
  isApproved: { type: Boolean, default: false },
  profileImage: String,
  phone: String,
  resume: String,

  // College Details
  collegeName: String,
  department: String,
  university: String,

  // Graduation Details
  degree: String, // Bachelors/Masters/PhD
  specialization: String,
  cgpa: String,
  currentYear: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'],
    default: '1st Year'
  },
  isGraduated: { type: Boolean, default: false },
  yearOfPassing: String,

  // Experience
  hasExperience: { type: Boolean, default: false },
  previousCompany: String,
  position: String,
  yearsOfExperience: String,

  // OTP for password reset
  otp: String,
  otpExpiresAt: Date,

  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

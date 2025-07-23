const mongoose = require('mongoose');
const Progress = require('../models/Progress');

const enrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountPaid: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: { type: String, enum: ["Stripe", "Razorpay", "PayPal", "Free"], default: "Free" },
  paymentStatus: { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending" },
  transactionId: String,
  receiptUrl: String,
  enrolledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);

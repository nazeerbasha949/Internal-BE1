const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  orderId: { type: String, required: true },
  paymentId: { type: String },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },

  receiptUrl: String,
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);

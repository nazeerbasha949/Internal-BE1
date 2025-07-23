// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    /* Who receives it */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /* Who created it (usually an admin) */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    /* Optional batch context (one notice may belong to several batches) */
    targetBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],

    /* Content */
    title:   { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['registration', 'course', 'event', 'quiz', 'certificate', 'system'],
      default: 'system',
    },
    link: String,

    /* Status */
    isRead:   { type: Boolean, default: false },
  },
  { timestamps: true }                       // createdAt + updatedAt
);

module.exports = mongoose.model('Notification', notificationSchema);

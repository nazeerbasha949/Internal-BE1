// controllers/notification.controller.js
const Notification = require('../models/Notification');
const Batch = require('../models/Batch');
const mongoose = require('mongoose');

// ✅ Correct import from shared socket module
const { getIo, getConnectedUsers } = require('../socketServer'); // ✅ updated

// Create Notification for single user
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, link } = req.body;
    const user = req.user._id;

    const notification = await Notification.create({ user, title, message, type, link });

    // Real-time emit if user is online
    const io = getIo();
    const connectedUsers = getConnectedUsers();
    const socketId = connectedUsers.get(user.toString());
    if (socketId) io.to(socketId).emit('newNotification', notification);

    res.status(201).json({ message: 'Notification sent', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error });
  }
};

// Get all notifications for authenticated user
exports.getNotificationsByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { isRead: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found or access denied' });
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!deleted) return res.status(404).json({ message: 'Notification not found or access denied' });
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error });
  }
};

// Notification stats (total & unread)
exports.notificationStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const total = await Notification.countDocuments({ user: userId });
    const unread = await Notification.countDocuments({ user: userId, isRead: false });
    res.status(200).json({ total, unread });
  } catch (error) {
    res.status(500).json({ message: 'Error getting notification stats', error });
  }
};

// Create notification for all users in selected batches
exports.createBatchNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'system',
      link,
      batchIds = [],
    } = req.body;

    let batches;
    if (batchIds === 'all' || batchIds.length === 0) {
      batches = await Batch.find().populate('users', 'name email');
    } else {
      const ids = batchIds.map((id) => new mongoose.Types.ObjectId(id));
      batches = await Batch.find({ _id: { $in: ids } }).populate('users', 'name email');
    }

    if (!batches.length) {
      return res.status(404).json({ message: 'No batches found' });
    }

    const userIds = [
      ...new Set(batches.flatMap((b) => b.users.map((u) => u._id.toString()))),
    ];

    const notifications = userIds.map((uid) => ({
      user: uid,
      createdBy: req.user._id,
      targetBatches: batchIds === 'all' ? [] : batchIds,
      title,
      message,
      type,
      link,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // 🔥 EMIT using correct shared reference
    const io = getIo();
    const connectedUsers = getConnectedUsers(); // ✅

    createdNotifications.forEach((notification) => {
      const socketId = connectedUsers.get(notification.user.toString());
      if (socketId) {
        io.to(socketId).emit('newNotification', notification);
        console.log(`📤 Real-time notification sent to ${notification.user}`);
      } else {
        console.log(`⚠️ User ${notification.user} not connected`);
      }
    });

    const batchDetails = batches.map((b) => ({
      id: b._id,
      name: b.name,
      startDate: b.startDate,
      users: b.users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
      })),
    }));

    return res.status(201).json({
      message: `Notification sent to ${userIds.length} users`,
      count: userIds.length,
      batches: batchDetails,
    });
  } catch (err) {
    console.error('❌ Batch notification error →', err);
    return res.status(500).json({
      message: 'Error creating batch notification',
      error: err.message || 'Unknown error',
    });
  }
};

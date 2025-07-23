const Event = require('../models/Event');
const Notification = require('../models/Notification');

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event', error: err });
  }
};

// Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 }).populate('registeredUsers createdBy');
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err });
  }
};

// Get Event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('registeredUsers createdBy');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch event', error: err });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Event updated successfully', updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event', error: err });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event', error: err });
  }
};

// Register for Event
exports.registerForEvent = async (req, res) => {
  try {
    const { userId, eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.registeredUsers.includes(userId))
      return res.status(400).json({ message: 'User already registered' });

    if (
      event.registrationRequired &&
      event.maxAttendees &&
      event.registeredUsers.length >= event.maxAttendees
    )
      return res.status(400).json({ message: 'Event is full' });

    event.registeredUsers.push(userId);
    await event.save();

    await Notification.create({
      user: userId,
      title: '📌 Event Registration Successful',
      message: `You are registered for ${event.title} on ${new Date(event.date).toDateString()}.`,
      type: 'event',
      link: `/events/${eventId}`,
    });

    res.status(200).json({ message: 'Successfully registered for event', event });
  } catch (err) {
    res.status(500).json({ message: 'Error registering for event', error: err });
  }
};

// Event Stats
exports.eventStats = async (req, res) => {
  try {
    const total = await Event.countDocuments();
    const upcoming = await Event.countDocuments({ date: { $gte: new Date() } });
    const completed = await Event.countDocuments({ date: { $lt: new Date() } });
    res.status(200).json({ total, upcoming, completed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch event stats', error: err });
  }
};

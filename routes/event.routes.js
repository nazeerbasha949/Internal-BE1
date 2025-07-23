const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');

// CRUD

router.post('/create', protect, allowRoles('admin'), eventController.createEvent);
router.get('/', protect, eventController.getAllEvents);
router.get('/stats', protect, eventController.eventStats);
router.get('/:id', protect, eventController.getEventById);
router.put('/:id', protect, allowRoles('admin'), eventController.updateEvent);
router.delete('/:id', protect, allowRoles('admin'), eventController.deleteEvent);
router.post('/register', protect, eventController.registerForEvent);

module.exports = router;

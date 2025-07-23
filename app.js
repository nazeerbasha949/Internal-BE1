const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection failed:', err));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));                         // Phase 1, 9
app.use('/api/users', require('./routes/user.routes'));                         // Phase 1, 13, 15
app.use('/api/courses', require('./routes/course.routes'));                     // Phase 2
app.use('/api/professors', require('./routes/professor.routes'));               // Phase 3
app.use('/api/enrollments', require('./routes/enrollment.routes'));             // Phase 4
app.use('/api/certificates', require('./routes/certificate.routes'));           // Phase 5
app.use('/api/events', require('./routes/event.routes'));                       // Phase 6
// app.use('/api/email', require('./routes/event.routes'));                        // Phase 7
app.use('/api/notifications', require('./routes/notification.routes'));         // Phase 8, 16
app.use('/api/payments', require('./routes/payment.routes'));                   // Phase 10
app.use('/api/quizzes', require('./routes/quiz.routes'));                       // Phase 11
app.use('/api/dashboard', require('./routes/dashboard.routes'));                // Phase 13
app.use('/api/progress', require('./routes/progress.routes'));                 // Phase 12
// app.use('/api/roles', require('./routes/'));                         // Phase 14
app.use('/api/batches', require('./routes/batch.routes')); 
app.use('/api/stats', require('./routes/stats.routes')); // Phase 17
// Default route
app.get('/', (req, res) => {
  res.send('🚀 Signavox Career Ladder API is running...');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.use((req, res, next) => {
  console.log('[DEBUG] Unmatched Route:', req.method, req.originalUrl);
  next();
});


// // Start server
// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });
module.exports = app; // ✅ Important: export the Express app
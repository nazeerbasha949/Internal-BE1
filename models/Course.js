const mongoose = require('mongoose');

const subTopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  videoUrl: String,
}, { _id: true });

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: String,
  subTopics: [subTopicSchema],
}, { _id: true });

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: String,
  topics: [topicSchema],
  quizIncluded: { type: Boolean, default: false },
  quizQuestions: [
    {
      question: String,
      options: [String],
      answer: String
    }
  ]
}, { _id: true });

const moduleSchema = new mongoose.Schema({
  moduleTitle: { type: String, required: true },
  moduleDescription: String,
  lessons: [lessonSchema]
}, { _id: true });

const courseSchema = new mongoose.Schema({
  /* Core info */
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true },          // SEO‑friendly URL
  description: String,
  type: {
    type: String,
    enum: ['Technical', 'Soft Skills', 'Management', 'Creative', 'Language', 'Other'],
    default: 'Technical',
    index: true,
  },
  category: { type: String, index: true },                    // e.g. “Web Development”
  subCategory: String,                                        // e.g. “React”
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  language: { type: String, default: 'English' },

  /* Pricing */
  price: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
  },
  isFree: { type: Boolean, default: false },

  /* Ratings & reviews */
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  ratingsCount: { type: Number, default: 0 },

  /* Media & assets */
  coverImage: String,
  promoVideoUrl: String,
  tags: [String],

  /* Nested content */
  duration: String,                 // total formatted duration (e.g. “12h 30m”)
  modules: [moduleSchema],

  /* Relations */
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  /* Operational flags */
  status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft' },
  publishedAt: Date,
},
  {
    timestamps: true,                 // createdAt + updatedAt
  }
);

module.exports = mongoose.model('Course', courseSchema);

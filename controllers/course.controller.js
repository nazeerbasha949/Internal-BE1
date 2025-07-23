const Course = require('../models/Course');
const Professor = require('../models/Professor');

exports.createCourse = async (req, res) => {
  try {
    const { professor, ...courseData } = req.body;

    // Validate professor
    const prof = await Professor.findById(professor).populate('courses');
    if (!prof) return res.status(404).json({ message: "Professor not found" });

    // Check if professor has any active courses (status === "Published")
    const hasActiveCourse = prof.courses.some(course => course.status === "Published");
    if (hasActiveCourse) {
      return res.status(400).json({ message: "Professor is already assigned to an active course. Please complete or archive it before assigning a new one." });
    }

    // Create the course with the professor assigned
    const course = await Course.create({ ...courseData, professor });

    // Add this course to the professor's courses array
    prof.courses.push(course._id);
    await prof.save();

    res.status(201).json({ message: "Course created and linked to professor", course });
  } catch (error) {
    console.error("Course creation error →", error);
    res.status(500).json({ message: "Error creating course", error });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('professor');
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('professor');
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: "Error fetching course", error });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Course not found" });
    res.status(200).json({ message: "Course updated", course: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating course", error });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.enrolledUsers.length > 0) {
      return res.status(400).json({
        message: "Cannot delete course: users are still enrolled. Ask users to complete or drop the course."
      });
    }

    await course.deleteOne(); // or use await Course.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error });
  }
};


exports.enrollUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (!course.enrolledUsers.includes(userId)) {
      course.enrolledUsers.push(userId);
      await course.save();
    }
    else return res.status(400).json({ message: "User already enrolled" });


    res.status(200).json({ message: "User enrolled", course });
  } catch (error) {
    res.status(500).json({ message: "Error enrolling user", error });
  }
};

exports.courseStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const topCourses = await Course.find().sort({ 'enrolledUsers.length': -1 }).limit(5);
    res.status(200).json({
      totalCourses,
      topCourses
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};

const Professor = require('../models/Professor');
const Course = require('../models/Course');

// Create professor
exports.createProfessor = async (req, res) => {
  try {
    const professor = await Professor.create(req.body);
    res.status(201).json({ message: "Professor added", professor });
  } catch (error) {
    res.status(500).json({ message: "Error creating professor", error });
  }
};

// Get all professors
exports.getAllProfessors = async (req, res) => {
  try {
    const professors = await Professor.find().populate('courses', 'title');
    res.status(200).json(professors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching professors", error });
  }
};

// Get single professor
exports.getProfessor = async (req, res) => {
  try {
    const professor = await Professor.findById(req.params.id).populate('courses');
    if (!professor) return res.status(404).json({ message: "Professor not found" });
    res.status(200).json(professor);
  } catch (error) {
    res.status(500).json({ message: "Error getting professor", error });
  }
};

// Update professor
exports.updateProfessor = async (req, res) => {
  try {
    const updated = await Professor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Professor not found" });
    res.status(200).json({ message: "Professor updated", professor: updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating professor", error });
  }
};

// Delete professor
exports.deleteProfessor = async (req, res) => {
  try {
    const deleted = await Professor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Professor not found" });
    res.status(200).json({ message: "Professor deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting professor", error });
  }
};

// Link course to professor (one-to-one mapping)
exports.assignCourseToProfessor = async (req, res) => {
  try {
    const { professorId, courseId } = req.body;

    const professor = await Professor.findById(professorId);
    const course = await Course.findById(courseId);

    if (!professor || !course) {
      return res.status(404).json({ message: "Professor or Course not found" });
    }

    // ❌ Prevent assigning if course already has a professor
    if (course.professor && course.professor.toString() !== professorId) {
      return res.status(400).json({ message: "Course is already assigned to another professor" });
    }

    // ✅ Add course to professor if not already present
    if (!professor.courses.includes(courseId)) {
      professor.courses.push(courseId);
      await professor.save();
    }

    // ✅ Assign professor to course (overwrite if same professor)
    course.professor = professorId;
    await course.save();

    res.status(200).json({ message: "Course assigned to professor", professor, course });
  } catch (error) {
    res.status(500).json({ message: "Error assigning course", error });
  }
};


exports.unassignCourseFromProfessor = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const professorId = course.professor;
    if (!professorId) return res.status(400).json({ message: "No professor assigned to this course" });

    // Remove course reference from professor
    const professor = await Professor.findById(professorId);
    if (professor) {
      professor.courses = professor.courses.filter(cId => cId.toString() !== courseId);
      await professor.save();
    }

    // Remove professor from course
    course.professor = null;
    await course.save();

    res.status(200).json({ message: "Professor unassigned from course", course });
  } catch (error) {
    res.status(500).json({ message: "Error unassigning professor", error });
  }
};



// Professor stats
exports.professorStats = async (req, res) => {
  try {
    const allProfessors = await Professor.find().populate('courses', 'title');
    const totalProfessors = allProfessors.length;

    const activeProfessors = allProfessors.filter(p => p.courses && p.courses.length > 0);
    const inactiveProfessors = allProfessors.filter(p => !p.courses || p.courses.length === 0);

    res.status(200).json({
      totalProfessors,
      activeProfessors: activeProfessors.length,
      inactiveProfessors: inactiveProfessors.length,
      allProfessorDetails: allProfessors.map(prof => ({
        id: prof._id,
        name: prof.name,
        email: prof.email,
        phone: prof.phone,
        courseCount: prof.courses.length,
        courses: prof.courses
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};

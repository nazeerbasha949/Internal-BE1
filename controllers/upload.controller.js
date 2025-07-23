exports.uploadUserResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    req.user.resumeUrl = req.file.path;
    await req.user.save();
    res.status(200).json({ message: 'Resume uploaded', path: req.file.path });
  } catch (err) {
    res.status(500).json({ message: 'Resume upload failed', error: err.message });
  }
};

exports.uploadCourseMaterial = async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const paths = req.files.map(f => f.path);
    course.materials.push(...paths);
    await course.save();
    res.status(200).json({ message: 'Materials uploaded', files: paths });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

exports.uploadEventBanner = async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.bannerImage = req.file.path;
    await event.save();
    res.status(200).json({ message: 'Banner uploaded', path: req.file.path });
  } catch (err) {
    res.status(500).json({ message: 'Banner upload failed', error: err.message });
  }
};

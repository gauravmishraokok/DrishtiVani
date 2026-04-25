const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const dashboardCacheService = require('../services/dashboardCache.service');

/**
 * POST /api/auth/onboard
 * Preserves user if name exists (case-insensitive) for the same class.
 */
router.post('/onboard', async (req, res) => {
  try {
    console.log('[Onboard] Incoming request:', req.body);
    const { name, class_num, subjects, language } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Use case-insensitive search for the user
    // We trim to avoid space mismatches
    const cleanName = name.trim();

    let student = await Student.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      class_num: class_num
    });

    if (student) {
      console.log(`[Onboard] Existing student found: ${student.name}. Updating profile.`);
      student.subjects = subjects;
      student.language = language;
      student.last_active = new Date();
      await student.save();
    } else {
      console.log(`[Onboard] Creating new student: ${cleanName}`);
      student = await Student.create({
        name: cleanName,
        class_num,
        subjects,
        language,
        last_active: new Date()
      });
    }

    // INVALIDATE CACHE ON ONBOARD
    await dashboardCacheService.invalidate(student._id);

    res.status(201).json(student);
  } catch (error) {
    console.error('[Onboard Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const cleanName = name.trim();
    // Case-insensitive exact match
    const students = await Student.find({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (students.length > 1) {
      return res.status(300).json({
        message: 'Multiple students found, please specify',
        choices: students.map(s => ({ _id: s._id, name: s.name, class_num: s.class_num }))
      });
    }

    // INVALIDATE CACHE ON LOGIN
    await dashboardCacheService.invalidate(students[0]._id);

    res.json(students[0]);
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me/:studentId
router.get('/me/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

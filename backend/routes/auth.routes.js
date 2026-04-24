const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// POST /api/auth/onboard
router.post('/onboard', async (req, res) => {
  try {
    console.log('[Onboard] Incoming request:', req.body);
    const { name, class_num, subjects, language } = req.body;
    
    let student = await Student.findOne({ name, class_num });
    if (student) {
      return res.status(400).json({ error: 'Student already exists' });
    }

    student = await Student.create({
      name,
      class_num,
      subjects,
      language
    });

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
    // Fuzzy match
    const students = await Student.find({ name: new RegExp(name, 'i') });
    
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (students.length > 1) {
      return res.status(300).json({ 
        message: 'Multiple students found, please specify', 
        choices: students.map(s => ({ id: s._id, name: s.name, class_num: s.class_num })) 
      });
    }

    res.json(students[0]);
  } catch (error) {
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

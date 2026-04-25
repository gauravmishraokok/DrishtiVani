const express = require('express');
const router = express.Router();
const progressService = require('../services/progress.service');
const dashboardCacheService = require('../services/dashboardCache.service');
const Chapter = require('../models/Chapter');
const Subject = require('../models/Subject');

// GET /api/progress/dashboard/:studentId
router.get('/dashboard/:studentId', async (req, res) => {
  try {
    const data = await dashboardCacheService.getDashboardData(req.params.studentId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/progress/catalog/:classNum
router.get('/catalog/:classNum', async (req, res) => {
  try {
    const classNum = parseInt(req.params.classNum);
    // Find all subjects for this class
    const subjects = await Subject.find({ class_num: classNum });
    const subjectIds = subjects.map(s => s._id);

    // Find all chapters for these subjects
    const chapters = await Chapter.find({ subject_id: { $in: subjectIds } })
      .populate('subject_id');

    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/progress/submit-quiz
router.post('/submit-quiz', async (req, res) => {
  try {
    const { studentId, chapterId, type, results } = req.body;
    const result = await progressService.submitQuizResult(studentId, chapterId, type, results);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

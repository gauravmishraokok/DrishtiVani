const express = require('express');
const router = express.Router();
const multer = require('multer');
const ingestionService = require('../services/ingestion.service');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/admin/ingest
router.post('/ingest', upload.single('pdf'), async (req, res) => {
  try {
    const { subject, classNum, chapterTitle, chapterNum } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Start ingestion in background (simulating async jobId for now)
    // we use await here for simple hackathon flow, but spec says async job.
    const result = await ingestionService.processPDF(
      req.file.buffer,
      subject,
      parseInt(classNum),
      chapterTitle,
      parseInt(chapterNum)
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/subject/:subjectId
router.delete('/subject/:subjectId', async (req, res) => {
  // Logic to delete subject and chunks
  res.json({ message: 'Subject deleted' });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ingestionService = require('../services/ingestion.service');

const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Chunk = require('../models/Chunk');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/admin/chapter/:chapterId
router.get('/chapter/:chapterId', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/catalog
router.get('/catalog', async (req, res) => {
  try {
    const subjects = await Subject.find().populate('chapters');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/ingest
router.post('/ingest', upload.single('pdf'), async (req, res) => {
  try {
    const { subject, classNum, chapterTitle, chapterNum } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

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

// DELETE /api/admin/chapter/:chapterId
router.delete('/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;

    // 1. Delete Chunks
    await Chunk.deleteMany({ chapter_id: chapterId });

    // 2. Remove Chapter from Subject list
    const chapter = await Chapter.findById(chapterId);
    if (chapter) {
      await Subject.updateOne(
        { _id: chapter.subject_id },
        { $pull: { chapters: chapterId } }
      );
    }

    // 3. Delete Chapter
    await Chapter.findByIdAndDelete(chapterId);

    res.json({ message: 'Chapter and associated chunks removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/subject/:subjectId
router.delete('/subject/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;
    const chapters = await Chapter.find({ subject_id: subjectId });
    const chapterIds = chapters.map(c => c._id);

    // Cleanup chunks, chapters, then subject
    await Chunk.deleteMany({ chapter_id: { $in: chapterIds } });
    await Chapter.deleteMany({ subject_id: subjectId });
    await Subject.findByIdAndDelete(subjectId);

    res.json({ message: 'Subject and all its chapters removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/chapter/:chapterId
router.patch('/chapter/:chapterId', async (req, res) => {
  try {
    const { title, chapterNum } = req.body;
    const updated = await Chapter.findByIdAndUpdate(
      req.params.chapterId,
      { title, chapter_num: chapterNum },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/subject/:subjectId
router.patch('/subject/:subjectId', async (req, res) => {
  try {
    const { name, classNum } = req.body;
    const updated = await Subject.findByIdAndUpdate(
      req.params.subjectId,
      { name, class_num: classNum },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Chapter = require('../models/Chapter');
const Progress = require('../models/Progress');
const ActiveQuiz = require('../models/ActiveQuiz');
const qaService = require('../services/qa.service');
const dashboardCacheService = require('../services/dashboardCache.service');

// POST /api/quiz/start-chapter
router.post('/start-chapter', async (req, res) => {
  try {
    const { studentId, chapterId, quizType } = req.body;

    const chapter = await Chapter.findById(chapterId);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const questions = quizType === 'mid' ? chapter.mid_quiz : chapter.final_quiz;
    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: `No ${quizType} quiz questions available.` });
    }

    const progress = await Progress.findOne({ student_id: studentId, chapter_id: chapterId });
    if (progress) {
      if (quizType === 'mid' && progress.mid_quiz_completed) return res.status(409).json({ error: 'Mid-quiz already completed' });
      if (quizType === 'final' && progress.final_quiz_completed) return res.status(409).json({ error: 'Final-quiz already completed' });
    }

    await ActiveQuiz.deleteMany({ student_id: studentId, chapter_id: chapterId });

    const session = await ActiveQuiz.create({
      student_id: studentId,
      chapter_id: chapterId,
      quiz_type: quizType,
      questions,
      current_index: 0,
      score: 0,
      results: []
    });

    res.json({
      question: questions[0],
      currentIndex: 0,
      total: questions.length,
      quizType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/quiz/answer
router.post('/answer', async (req, res) => {
  try {
    const { studentId, answerLetter } = req.body;

    const session = await ActiveQuiz.findOne({ student_id: studentId }).sort({ created_at: -1 });
    if (!session) return res.status(404).json({ error: 'No active quiz found' });

    const currentQuestion = session.questions[session.current_index];
    const normalizedAns = (answerLetter || '').toString().trim().toUpperCase();
    const isCorrect = normalizedAns === (currentQuestion.correct_answer || '').toUpperCase();

    session.results.push({
      question: currentQuestion.question,
      selected: normalizedAns,
      correct: isCorrect,
      concept: currentQuestion.concept_tested,
      timestamp: new Date()
    });

    if (isCorrect) session.score++;
    session.current_index++;

    if (session.current_index < session.questions.length) {
      await session.save();
      res.json({
        correct: isCorrect,
        nextQuestion: session.questions[session.current_index],
        currentIndex: session.current_index,
        total: session.questions.length,
        score: session.score,
        finished: false
      });
    } else {
      // Quiz finished
      const scorePercentage = Math.round((session.score / session.questions.length) * 100);
      let progress = await Progress.findOne({ student_id: session.student_id, chapter_id: session.chapter_id });

      const resultsToSave = session.results.map(r => ({
        question: r.question,
        selected_answer: r.selected,
        correct_answer: session.questions.find(q => q.question === r.question)?.correct_answer,
        concept_tested: r.concept,
        correct: r.correct,
        timestamp: r.timestamp
      }));

      if (progress) {
        if (session.quiz_type === 'mid') {
          progress.mid_quiz_completed = true;
          progress.mid_quiz_results = resultsToSave;
        } else {
          progress.final_quiz_completed = true;
          progress.final_quiz_results = resultsToSave;
        }
        await progress.save();
      }

      // Invalidate dashboard cache
      await dashboardCacheService.invalidate(session.student_id);

      // Re-teach logic
      const wrongResults = session.results.filter(r => !r.correct);
      let remedialTeaching = "";
      const weakConcepts = [];

      if (wrongResults.length > 0) {
        remedialTeaching = `You got ${wrongResults.length} questions wrong. Let me review those concepts with you. `;
        for (const r of wrongResults) {
          weakConcepts.push(r.concept);
          try {
            const ragResponse = await qaService.answerQuestion(r.concept, studentId, session.chapter_id);
            remedialTeaching += `About ${r.concept}: ${ragResponse.answer} `;
          } catch (e) {
            console.error(`[Remedial] Fail for ${r.concept}`);
          }
        }
      }

      await ActiveQuiz.findByIdAndDelete(session._id);

      res.json({
        finished: true,
        score: scorePercentage,
        results: resultsToSave,
        remedialTeaching: remedialTeaching.trim(),
        weakConcepts
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const quizService = require('../services/quiz.service');
const Progress = require('../models/Progress');

// Simulating in-memory quiz state for now
const quizStates = new Map();

// POST /api/quiz/start
router.post('/start', async (req, res) => {
  const { sessionId, studentId, chapterId } = req.body;
  const resolvedStudentId = sessionId || studentId;
  if (!resolvedStudentId || !chapterId) {
    return res.status(400).json({ error: 'studentId/sessionId and chapterId are required' });
  }

  const quizData = await quizService.startQuiz(chapterId, resolvedStudentId);
  if (!quizData.questions?.length) {
    return res.status(404).json({ error: 'No quiz questions available for this chapter yet' });
  }

  quizStates.set(resolvedStudentId, { ...quizData, results: [] });
  res.json({ question: quizData.questions[0], currentIndex: 0, total: quizData.questions.length });
});

// POST /api/quiz/answer
router.post('/answer', async (req, res) => {
  const { sessionId, studentId, answerLetter } = req.body;
  const resolvedStudentId = sessionId || studentId;
  const state = quizStates.get(resolvedStudentId);
  
  if (!state) return res.status(404).json({ error: 'Quiz not found' });

  const currentQuestion = state.questions[state.currentIndex];
  const normalizedAnswer = (answerLetter || '').toString().trim().toUpperCase();
  const isCorrect = (currentQuestion.correct_answer || '').toString().trim().toUpperCase() === normalizedAnswer;

  state.results.push({
    chunk_id: currentQuestion.chunk_id,
    concept_tested: currentQuestion.concept_tested,
    correct: isCorrect
  });

  if (isCorrect) state.score++;

  state.currentIndex++;

  if (state.currentIndex < state.questions.length) {
    res.json({ 
      correct: isCorrect, 
      nextQuestion: state.questions[state.currentIndex],
      currentIndex: state.currentIndex,
      total: state.questions.length,
      score: state.score
    });
  } else {
    // Quiz finished
    const remedial = await quizService.evaluateAndReTeach(resolvedStudentId, state.chapterId, state.results);
    
    // Save all results to progress
    const progress = await Progress.findOne({ student_id: resolvedStudentId, chapter_id: state.chapterId });
    if (progress) {
      progress.quiz_results.push(...state.results);
      await progress.save();
    }

    quizStates.delete(resolvedStudentId);
    res.json({ 
      correct: isCorrect, 
      finished: true, 
      score: state.score, 
      remedialText: remedial.text 
    });
  }
});

module.exports = router;

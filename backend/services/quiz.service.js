const Chunk = require('../models/Chunk');
const Progress = require('../models/Progress');
const teachingService = require('./teaching.service');

const startQuiz = async (chapterId, studentId) => {
  try {
    const chunks = await Chunk.find({ chapter_id: chapterId });
    const allQuestions = chunks.flatMap((c) =>
      (c.quiz || []).map((q) => {
        const options = q.options || {};
        return {
          ...q,
          question: q.question || 'Please choose the correct answer.',
          options: {
            A: options.A || options.a || options.optionA || '',
            B: options.B || options.b || options.optionB || '',
            C: options.C || options.c || options.optionC || '',
            D: options.D || options.d || options.optionD || '',
          },
          correct_answer: (q.correct_answer || q.answer || 'A').toString().trim().toUpperCase(),
          chunk_id: c._id,
        };
      })
    ).filter((q) => q.question && (q.options.A || q.options.B || q.options.C || q.options.D));
    
    // Select 5 random questions
    const selected = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
    
    return {
      chapterId,
      questions: selected,
      currentIndex: 0,
      score: 0
    };
  } catch (error) {
    console.error(`[QuizService] Error: ${error.message}`);
    throw error;
  }
};

const evaluateAndReTeach = async (studentId, chapterId, results) => {
  try {
    const progress = await Progress.findOne({ student_id: studentId, chapter_id: chapterId });
    
    // Find concepts with wrong answers
    const wrongAnswers = results.filter(r => !r.correct);
    const weakConcepts = [...new Set(wrongAnswers.map(r => r.concept_tested))];

    if (weakConcepts.length === 0) {
      return { 
        text: "Congratulations! You got everything right. You have mastered this chapter.",
        data: { action: 'QUIZ_MASTERED' }
      };
    }

    // Pick one weak concept to re-explain
    const reTeachChunkId = wrongAnswers[0].chunk_id;
    const chunk = await Chunk.findById(reTeachChunkId);
    
    return {
      text: `You missed a few points about ${weakConcepts[0]}. Let me explain that again: ${chunk.teaching_script}`,
      data: { action: 'RE_TEACH', concept: weakConcepts[0] }
    };
  } catch (error) {
    console.error(`[QuizService] Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  startQuiz,
  evaluateAndReTeach
};

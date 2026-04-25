const Progress = require('../models/Progress');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { Groq } = require('groq-sdk');
const { groq: groqConfig } = require('../config/env');

const groq = new Groq({ apiKey: groqConfig.apiKey });

const getDashboardData = async (studentId) => {
  try {
    const progressRecords = await Progress.find({ student_id: studentId })
      .populate('subject_id')
      .populate('chapter_id');

    const subjectsData = await Promise.all(progressRecords.map(async (p) => {
      const chapter = p.chapter_id;
      const completionPercent = chapter.total_chunks > 0
        ? (p.completed_chunks.length / chapter.total_chunks) * 100
        : 0;

      const correctAnswers = p.quiz_results.filter(r => r.correct).length;
      const totalQuizQuestions = p.quiz_results.length;
      const quizAvg = totalQuizQuestions > 0 ? (correctAnswers / totalQuizQuestions) * 100 : 0;

      return {
        subjectName: p.subject_id.name,
        chapterTitle: chapter.title,
        completionPercent: Math.round(completionPercent),
        quizAvg: Math.round(quizAvg)
      };
    }));

    // Identify weak concepts (<60% accuracy or missed multiple times)
    const weakConcepts = [];
    const conceptStats = {};

    progressRecords.forEach(p => {
      p.quiz_results.forEach(res => {
        if (!conceptStats[res.concept]) conceptStats[res.concept] = { correct: 0, total: 0 };
        conceptStats[res.concept].total++;
        if (res.correct) conceptStats[res.concept].correct++;
      });
    });

    Object.keys(conceptStats).forEach(concept => {
      const accuracy = (conceptStats[concept].correct / conceptStats[concept].total) * 100;
      if (accuracy < 60) weakConcepts.push(concept);
    });

    // Generate AI Insight
    let aiInsight = "Keep up the great work! You're making steady progress.";
    if (subjectsData.length > 0) {
      const summary = JSON.stringify(subjectsData);
      const prompt = `
        Given this student progress data: ${summary}, 
        write 3 short encouraging insights about their learning pattern. 
        Focus on their strengths and mention one area to improve based on their quiz average.
        Max 2 sentences each.
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: groqConfig.model,
      });
      aiInsight = response.choices[0].message.content;
    }

    return {
      subjects: subjectsData,
      weakConcepts,
      aiInsight
    };
  } catch (error) {
    console.error(`[ProgressService] Error: ${error.message}`);
    throw error;
  }
};

const submitQuizResult = async (studentId, chapterId, type, results) => {
  try {
    const progress = await Progress.findOne({ student_id: studentId, chapter_id: chapterId });
    if (!progress) throw new Error('Progress record not found');

    if (type === 'mid') {
      progress.mid_quiz_completed = true;
      progress.mid_quiz_results = results;
    } else {
      progress.final_quiz_completed = true;
      progress.final_quiz_results = results;
      progress.chapter_completed = true;
    }

    progress.last_updated = Date.now();
    await progress.save();

    const dashboardCacheService = require('./dashboardCache.service');
    await dashboardCacheService.invalidate(studentId);

    return { success: true };
  } catch (error) {
    console.error(`[ProgressService] Quiz Submit Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getDashboardData,
  submitQuizResult
};

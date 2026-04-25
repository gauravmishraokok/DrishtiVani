const DashboardCache = require('../models/DashboardCache');
const Progress = require('../models/Progress');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const { Groq } = require('groq-sdk');
const { groq: groqConfig } = require('../config/env');

const groq = new Groq({ apiKey: groqConfig.apiKey });

const invalidate = async (studentId) => {
    await DashboardCache.deleteOne({ student_id: studentId });
};

const computeStudyStreak = async (studentId) => {
    try {
        const records = await Progress.find({ student_id: studentId }).sort({ last_updated: -1 });
        if (records.length === 0) return 0;
        const dates = records.map(r => r.last_updated.toISOString().split('T')[0]);
        const uniqueDates = [...new Set(dates)];
        let streak = 0; let current = new Date();
        for (let i = 0; i < uniqueDates.length; i++) {
            const dStr = current.toISOString().split('T')[0];
            if (uniqueDates.includes(dStr)) { streak++; current.setDate(current.getDate() - 1); } else break;
        }
        return streak;
    } catch (e) { return 0; }
};

const computeAchievements = (data) => {
    const achievements = [];
    try {
        const completedChapters = data.subjects_data.reduce((acc, sub) =>
            acc + sub.chapters.filter(ch => ch.completionPercent === 100).length, 0);
        if (completedChapters >= 1) achievements.push({ id: 'first_chapter', title: 'First Chapter', description: 'You completed your first lesson!' });
        if (data.study_streak_days >= 7) achievements.push({ id: 'consistent_learner', title: 'Consistent Learner', description: '7-day study streak achieved!' });
        const hasHighScorer = data.subjects_data.some(sub =>
            sub.chapters.some(ch => (ch.mid_quiz_score >= 80) || (ch.final_quiz_score >= 80))
        );
        if (hasHighScorer) achievements.push({ id: 'high_scorer', title: 'High Scorer', description: 'Scored 80% or higher on a quiz!' });
    } catch (e) { }
    return achievements;
};

const getDashboardData = async (studentId) => {
    try {
        if (!studentId || studentId === 'onboarding') {
            return { subjects_data: [], overall_completion: 0, overall_quiz_avg: 0, ai_insight: "Welcome!", study_streak_days: 0, achievements: [] };
        }
        const cached = await DashboardCache.findOne({ student_id: studentId });
        if (cached) return cached;

        const student = await Student.findById(studentId);
        if (!student) return { subjects_data: [], overall_completion: 0, overall_quiz_avg: 0, ai_insight: "Profile not found.", study_streak_days: 0, achievements: [] };

        const subjects = await Subject.find({ class_num: student.class_num });
        console.log(`[Dashboard] Fetched ${subjects.length} subjects for student ${student.name} (Class ${student.class_num})`);

        const chapters = await Chapter.find({ subject_id: { $in: subjects.map(s => s._id) } });
        const progressRecords = await Progress.find({ student_id: studentId });

        // DEDUPLICATION LOGIC: Group subjects by name (case-insensitive)
        const groupedSubjects = {};
        subjects.forEach(sub => {
            const key = sub.name.trim().toLowerCase();
            if (!groupedSubjects[key]) {
                groupedSubjects[key] = { name: sub.name, ids: [sub._id], chapters: [] };
            } else {
                groupedSubjects[key].ids.push(sub._id);
            }
        });

        const subjectsData = Object.values(groupedSubjects).map(group => {
            // Find ALL chapters belonging to ANY subject ID in this name group
            const subChapters = chapters.filter(ch => group.ids.some(id => id.toString() === ch.subject_id.toString()));

            // Deduplicate chapters in this group by chapter_num
            const uniqueChapters = {};
            subChapters.forEach(ch => {
                if (!uniqueChapters[ch.chapter_num] || ch.createdAt > uniqueChapters[ch.chapter_num].createdAt) {
                    uniqueChapters[ch.chapter_num] = ch;
                }
            });

            return {
                subjectName: group.name,
                subjectId: group.ids[0], // Use first ID for routes
                chapters: Object.values(uniqueChapters).map(ch => {
                    const p = progressRecords.find(pr => pr.chapter_id.toString() === ch._id.toString());
                    const totalSteps = ch.total_chunks || 1;
                    const comp = (p) ? (p.completed_chunks.length / totalSteps) * 100 : 0;
                    return {
                        chapterId: ch._id, chapterTitle: ch.title, chapterNum: ch.chapter_num,
                        completionPercent: Math.round(comp),
                        mid_quiz_score: (p && p.mid_quiz_completed) ? Math.round((p.mid_quiz_results.filter(r => r.correct).length / Math.max(1, p.mid_quiz_results.length)) * 100) : null,
                        final_quiz_score: (p && p.final_quiz_completed) ? Math.round((p.final_quiz_results.filter(r => r.correct).length / Math.max(1, p.final_quiz_results.length)) * 100) : null,
                        last_accessed: p?.last_updated || null
                    };
                }).sort((a, b) => a.chapterNum - b.chapterNum)
            };
        });

        const activeChapters = progressRecords.length;
        const totalComp = subjectsData.reduce((acc, s) => acc + s.chapters.reduce((ac, ch) => ac + ch.completionPercent, 0), 0);
        const overallComp = activeChapters > 0 ? totalComp / activeChapters : 0;

        let totalScore = 0; let quizCount = 0;
        subjectsData.forEach(s => s.chapters.forEach(ch => {
            if (ch.mid_quiz_score !== null) { totalScore += ch.mid_quiz_score; quizCount++; }
            if (ch.final_quiz_score !== null) { totalScore += ch.final_quiz_score; quizCount++; }
        }));
        const overallScore = quizCount > 0 ? totalScore / quizCount : 0;

        const streak = await computeStudyStreak(studentId);
        const freshData = {
            student_id: studentId, subjects_data: subjectsData,
            overall_completion: Math.round(overallComp), overall_quiz_avg: Math.round(overallScore),
            ai_insight: "Subjects ready. Which lesson shall we start today?",
            study_streak_days: streak, cached_at: new Date()
        };
        freshData.achievements = computeAchievements(freshData);
        await DashboardCache.findOneAndUpdate({ student_id: studentId }, freshData, { upsert: true });
        return freshData;
    } catch (error) {
        console.error(`[DashboardCache Error]: ${error.message}`);
        return { subjects_data: [], overall_completion: 0, overall_quiz_avg: 0, ai_insight: "System warming up.", study_streak_days: 0, achievements: [] };
    }
};

module.exports = { invalidate, getDashboardData };

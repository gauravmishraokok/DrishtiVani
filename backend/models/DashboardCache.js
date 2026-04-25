const mongoose = require('mongoose');

const dashboardCacheSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', unique: true, required: true },
    cached_at: { type: Date, default: Date.now },
    subjects_data: [{
        subjectName: String,
        subjectId: mongoose.Schema.Types.ObjectId,
        chapters: [{
            chapterId: mongoose.Schema.Types.ObjectId,
            chapterTitle: String,
            completionPercent: Number,
            mid_quiz_score: Number,
            final_quiz_score: Number,
            mid_quiz_mistakes: [{ question: String, selected: String, correct: String, concept: String }],
            final_quiz_mistakes: [{ question: String, selected: String, correct: String, concept: String }],
            time_studied_minutes: Number,
            last_accessed: Date
        }]
    }],
    overall_completion: { type: Number, default: 0 },
    overall_quiz_avg: { type: Number, default: 0 },
    weak_concepts: [String],
    ai_insight: String,
    study_streak_days: { type: Number, default: 0 },
    achievements: [{
        id: String,
        title: String,
        description: String,
        earned_at: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('DashboardCache', dashboardCacheSchema);

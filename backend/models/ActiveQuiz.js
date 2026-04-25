const mongoose = require('mongoose');

const activeQuizSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
    quiz_type: { type: String, enum: ['mid', 'final'], required: true },
    questions: [{
        question: String,
        options: {
            A: String,
            B: String,
            C: String,
            D: String
        },
        correct_answer: String,
        concept_tested: String
    }],
    current_index: { type: Number, default: 0 },
    results: [{
        question: String,
        selected: String,
        correct: Boolean,
        concept: String,
        timestamp: { type: Date, default: Date.now }
    }],
    score: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now, expires: 3600 } // TTL 1 hour
});

module.exports = mongoose.model('ActiveQuiz', activeQuizSchema);

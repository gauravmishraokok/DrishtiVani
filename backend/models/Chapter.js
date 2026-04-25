const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true }
  },
  correct_answer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  concept_tested: { type: String },
  page_refs: [{ type: Number }]
});

const chapterSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  chapter_num: { type: Number, required: true },
  total_chunks: { type: Number, default: 0 },
  total_pages: { type: Number, default: 0 },
  page_image_dir: { type: String },
  mid_quiz: [quizQuestionSchema],
  final_quiz: [quizQuestionSchema],
  mid_quiz_trigger_index: { type: Number },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chapter', chapterSchema);

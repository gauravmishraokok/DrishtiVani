const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chunk_index: { type: Number, required: true },
  heading: { type: String },
  raw_text: { type: String, required: true },
  word_count: { type: Number },
  teaching_script: { type: String, required: true },
  teaching_script_hi: { type: String }, // for Hindi support
  quiz: [{
    question: { type: String, required: true },
    options: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true }
    },
    correct_answer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    concept_tested: { type: String }
  }],
  image_descriptions: [{ type: String }],
  qdrant_id: { type: String }
});

module.exports = mongoose.model('Chunk', chunkSchema);

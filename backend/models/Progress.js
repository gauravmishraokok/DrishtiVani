const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  completed_chunks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
  current_chunk_index: { type: Number, default: 0 },
  quiz_results: [{
    chunk_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
    concept: { type: String },
    correct: { type: Boolean },
    timestamp: { type: Date, default: Date.now }
  }],
  chapter_completed: { type: Boolean, default: false },
  last_updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Progress', progressSchema);

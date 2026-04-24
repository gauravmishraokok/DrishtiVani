const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  chapter_num: { type: Number, required: true },
  chunk_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
  total_chunks: { type: Number, default: 0 }
});

module.exports = mongoose.model('Chapter', chapterSchema);

const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chunk_index: { type: Number, required: true },          // global sequential index within chapter (0,1,2,...)
  page_num: { type: Number, required: true },             // which PDF page (1-based)
  sub_chunk_index: { type: Number, required: true },      // index within the page's sub-chunks (0,1,2...)
  total_sub_chunks_for_page: { type: Number, required: true }, // how many segments this page produced
  is_first_of_chapter: { type: Boolean, default: false }, // only true when chunk_index === 0
  heading: { type: String },              // section heading if detected
  raw_text: { type: String, required: true },             // the page's raw text
  word_count: { type: Number },
  teaching_script: { type: String, required: true },      // THIS sub-chunk's teaching segment
  teaching_script_hi: { type: String },
  page_image_path: { type: String },      // relative path to PNG
  qdrant_id: { type: String },
  created_at: { type: Date, default: Date.now }
});

// Index for quick navigation and uniqueness
chunkSchema.index({ chapter_id: 1, chunk_index: 1 }, { unique: true });

module.exports = mongoose.model('Chunk', chunkSchema);

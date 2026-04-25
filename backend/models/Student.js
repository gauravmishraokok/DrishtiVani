const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class_num: { type: Number, required: true, min: 1, max: 12 },
  subjects: [{ type: String }], // e.g., ["Science", "Maths"]
  language: { type: String, default: 'en', enum: ['en', 'hi'] },
  streak: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  last_active: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);

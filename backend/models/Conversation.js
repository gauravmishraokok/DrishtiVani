const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session_date: { type: Date, default: Date.now },
  messages: [{
    role: { type: String, enum: ['teacher', 'student'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  subject_context: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  chapter_context: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }
});

module.exports = mongoose.model('Conversation', conversationSchema);

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const teachingService = require('../services/teaching.service');
const Conversation = require('../models/Conversation');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Progress = require('../models/Progress');

// Intent classification patterns
const intents = [
  {
    name: 'ENTER_DOUBT_MODE',
    regex: /i have (a )?doubt|i am confused|explain this|question/i,
    handler: async () => {
      return {
        text: 'Switching to doubt mode. Ask your question, and when done say continue learning.',
        data: { action: 'ENTER_DOUBT_MODE', voiceMode: 'AGENT' },
      };
    },
  },
  {
    name: 'EXIT_DOUBT_MODE',
    regex: /continue learning|lets continue|back to lesson|resume lesson|i understood|understood|move on|let'?s move on|next concept|continue chapter/i,
    handler: async () => {
      return {
        text: 'Great. Switching back to teaching mode.',
        data: { action: 'EXIT_DOUBT_MODE', voiceMode: 'VT' },
      };
    },
  },
  {
    name: 'START_CHAPTER',
    regex: /start (.*) chapter (\d+)/i,
    handler: async (match, sessionId) => {
      const subjectName = match[1].trim();
      const chapterNum = parseInt(match[2]);

      const subject = await Subject.findOne({ name: new RegExp(subjectName, 'i') });
      if (!subject) return { text: `Sorry, I couldn't find the subject ${subjectName}.` };

      const chapter = await Chapter.findOne({ subject_id: subject._id, chapter_num: chapterNum });
      if (!chapter) return { text: `Sorry, I couldn't find chapter ${chapterNum} for ${subjectName}.` };

      const content = await teachingService.getChunkContent(sessionId, chapter._id, 0);
      return {
        text: content.script,
        data: {
          action: 'START_CHAPTER',
          voiceMode: 'VT',
          chapterId: chapter._id,
          chunkIndex: content.chunkIndex,
          totalChunks: content.totalChunks,
          rawText: content.rawText,
          pageNum: content.pageNum,
          pageImagePath: content.pageImagePath,
          triggerMidQuiz: content.triggerMidQuiz,
          triggerFinalQuiz: content.triggerFinalQuiz
        }
      };
    }
  },
  {
    name: 'START_SUBJECT_CHAPTER',
    regex: /(?:learn|read|start)\s+(.+?)\s+chapter\s+(.+)/i,
    handler: async (match, sessionId) => {
      const subjectName = match[1].trim();
      const chapterToken = match[2].trim();
      const subject = await Subject.findOne({ name: new RegExp(`^${subjectName}$`, 'i') });
      if (!subject) return { text: `I could not find subject ${subjectName}. Please try again.` };

      let chapter = null;
      const chapterNumMatch = chapterToken.match(/\d+/);
      if (chapterNumMatch) {
        chapter = await Chapter.findOne({ subject_id: subject._id, chapter_num: parseInt(chapterNumMatch[0], 10) });
      }
      if (!chapter) {
        chapter = await Chapter.findOne({ subject_id: subject._id, title: new RegExp(chapterToken, 'i') });
      }
      if (!chapter) return { text: `I could not find chapter ${chapterToken} in ${subjectName}.` };

      let progress = await Progress.findOne({ student_id: sessionId, chapter_id: chapter._id });
      if (!progress) {
        progress = await Progress.create({
          student_id: sessionId,
          subject_id: chapter.subject_id,
          chapter_id: chapter._id,
          current_chunk_index: 0,
        });
      }

      const chunkIndex = progress.current_chunk_index || 0;
      const content = await teachingService.getChunkContent(sessionId, chapter._id, chunkIndex);
      if (!content) return { text: 'I could not load this chapter content right now.' };
      return {
        text: content.script,
        data: {
          action: 'START_CHAPTER',
          voiceMode: 'VT',
          chapterId: chapter._id,
          chunkIndex: content.chunkIndex,
          totalChunks: content.totalChunks,
          rawText: content.rawText,
          pageNum: content.pageNum,
          pageImagePath: content.pageImagePath,
          triggerMidQuiz: content.triggerMidQuiz,
          triggerFinalQuiz: content.triggerFinalQuiz
        },
      };
    },
  },
  {
    name: 'CONTINUE',
    regex: /continue|next/i,
    handler: async (match, sessionId) => {
      // Find last active progress to know where we are
      const progress = await Progress.findOne({ student_id: sessionId }).sort({ last_updated: -1 });
      if (!progress) return { text: "What would you like to start learning?" };

      const nextIndex = progress.current_chunk_index + 1;
      const content = await teachingService.getChunkContent(sessionId, progress.chapter_id, nextIndex);

      if (!content) return { text: "That was the last part of this chapter! Great job finishing." };

      return {
        text: content.script,
        data: {
          action: 'CONTINUE',
          voiceMode: 'VT',
          chunkIndex: content.chunkIndex,
          totalChunks: content.totalChunks,
          rawText: content.rawText,
          chapterId: progress.chapter_id,
          pageNum: content.pageNum,
          pageImagePath: content.pageImagePath,
          triggerMidQuiz: content.triggerMidQuiz,
          triggerFinalQuiz: content.triggerFinalQuiz
        }
      };
    }
  },
  {
    name: 'QA',
    regex: /what is (.*)/i,
    handler: async (match, sessionId) => {
      const qaService = require('../services/qa.service');
      const question = match[1];
      const result = await qaService.answerQuestion(question, sessionId);
      return { text: result.answer, data: { action: 'QA', voiceMode: 'AGENT' } };
    }
  },
  {
    name: 'START_QUIZ',
    regex: /quiz|test me/i,
    handler: async (match, sessionId) => {
      const progress = await Progress.findOne({ student_id: sessionId }).sort({ last_updated: -1 });
      if (!progress) return { text: "You need to learn something before I can test you!" };
      return { text: "Okay, starting a short quiz on what we just learned.", data: { action: 'START_QUIZ', chapterId: progress.chapter_id, voiceMode: 'VT' } };
    }
  }
  // ... more intents like QA, QUIZ can be added here
];

router.post('/command', async (req, res) => {
  try {
    const { studentId, transcript } = req.body;
    const sessionId = studentId;
    const normalizedTranscript = (transcript || '').trim();
    if (!normalizedTranscript) {
      return res.status(400).json({ error: 'Transcript is required.' });
    }

    let responseText = "";
    let actionData = { action: 'UNKNOWN' };
    let handled = false;

    for (const intent of intents) {
      // Skip the old restricted QA regex
      if (intent.name === 'QA') continue;

      const match = normalizedTranscript.match(intent.regex);
      if (match) {
        const result = await intent.handler(match, sessionId);
        responseText = result.text;
        actionData = result.data || { action: intent.name };
        handled = true;
        break;
      }
    }

    // Default to RAG QA if no intent is matched
    if (!handled) {
      const qaService = require('../services/qa.service');
      const activeProgress = await Progress.findOne({ student_id: sessionId }).sort({ last_updated: -1 });
      const result = await qaService.answerQuestion(normalizedTranscript, sessionId, activeProgress?.chapter_id);
      responseText = result.answer || "I couldn't find an answer to that in the textbook. Could you rephrase?";
      actionData = { action: 'QA', voiceMode: 'AGENT' };
    }

    // Save to conversation history
    let conversation = await Conversation.findOne({ student_id: sessionId }).sort({ session_date: -1 });
    if (!conversation) {
      conversation = await Conversation.create({ student_id: sessionId, messages: [] });
    }

    conversation.messages.push({ role: 'student', text: normalizedTranscript });
    conversation.messages.push({ role: 'teacher', text: responseText });
    await conversation.save();

    res.json({ text: responseText, ...actionData, useClientTTS: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/session/start-chapter
router.post('/start-chapter', async (req, res) => {
  try {
    const { studentId, chapterId, subjectRef } = req.body;

    let chapter = null;
    const chapterToken = String(chapterId || '').trim();
    if (mongoose.isValidObjectId(chapterToken)) {
      chapter = await Chapter.findById(chapterToken);
    } else {
      const chapterNum = parseInt(chapterToken, 10);
      if (!Number.isNaN(chapterNum)) {
        let subject = null;
        if (subjectRef) {
          const subjectToken = String(subjectRef).trim();
          subject = mongoose.isValidObjectId(subjectToken)
            ? await Subject.findById(subjectToken)
            : await Subject.findOne({ name: new RegExp(`^${subjectToken}$`, 'i') });
        }

        const query = { chapter_num: chapterNum };
        if (subject?._id) {
          query.subject_id = subject._id;
        }
        chapter = await Chapter.findOne(query).sort({ chapter_num: 1 });
      }
    }

    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    let progress = await Progress.findOne({ student_id: studentId, chapter_id: chapter._id });
    if (!progress) {
      progress = new Progress({
        student_id: studentId,
        subject_id: chapter.subject_id,
        chapter_id: chapter._id,
        current_chunk_index: 0
      });
      await progress.save();
    }

    const chunkIndex = progress.current_chunk_index || 0;
    const content = await teachingService.getChunkContent(studentId, chapter._id, chunkIndex);

    if (!content) {
      console.error(`[Session] Content not found for Ch ${chapter._id} at index ${chunkIndex}`);
      return res.status(404).json({ error: 'No study material found for this chapter yet. It might still be processing.' });
    }

    res.json({
      action: 'START_CHAPTER',
      voiceMode: 'VT',
      text: content.script,
      rawText: content.rawText || "Content loading...",
      chapterId: chapter._id,
      chunkIndex: chunkIndex,
      totalChunks: content.totalChunks,
      pageNum: content.pageNum,
      pageImagePath: content.pageImagePath,
      triggerMidQuiz: content.triggerMidQuiz,
      triggerFinalQuiz: content.triggerFinalQuiz,
      useClientTTS: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/session/conversation/:sessionId
router.get('/conversation/:sessionId', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ student_id: req.params.sessionId }).sort({ session_date: -1 });
    res.json(conversation ? conversation.messages : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

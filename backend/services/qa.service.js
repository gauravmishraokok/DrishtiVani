const { Groq } = require('groq-sdk');
const { groq: groqConfig } = require('../config/env');
const vectorAdapter = require('../adapters/vector.adapter');
const Chunk = require('../models/Chunk');
const Student = require('../models/Student');
const Progress = require('../models/Progress');
const embeddingService = require('./embedding.service');

const groq = new Groq({ apiKey: groqConfig.apiKey });

/**
 * Answers free-form questions using RAG (Qdrant + Groq).
 */
const answerQuestion = async (question, studentId, chapterId = null) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return { answer: "I could not find your student profile. Please try onboarding again.", sourceChunks: [] };
    }

    // 1. Build deterministic semantic embedding for retrieval
    const queryVector = embeddingService.textToVector(question);

    let contextText = "";
    let chunkIds = [];

    let activeChapterId = chapterId;
    let activeSubjectId = null;
    if (!activeChapterId) {
      const activeProgress = await Progress.findOne({ student_id: studentId }).sort({ last_updated: -1 });
      if (activeProgress) {
        activeChapterId = activeProgress.chapter_id?.toString() || null;
        activeSubjectId = activeProgress.subject_id?.toString() || null;
      }
    }

    const filter = activeChapterId || activeSubjectId
      ? {
        must: [
          ...(activeSubjectId ? [{ key: 'subject_id', match: { value: activeSubjectId } }] : []),
          ...(activeChapterId ? [{ key: 'chapter_id', match: { value: activeChapterId } }] : []),
        ],
      }
      : null;

    try {
      const searchResults = await vectorAdapter.searchChunks(queryVector, 3, filter);
      chunkIds = searchResults
        .map((r) => vectorAdapter.uuidToMongo(r.chunkId))
        .filter(Boolean);
      const chunks = await Chunk.find({ _id: { $in: chunkIds } }).sort({ chunk_index: 1 });
      contextText = chunks.map(c => c.raw_text).join('\n\n');
    } catch (vErr) {
      console.warn(`[QA Service] Vector search failed, trying chapter fallback.`);
      if (activeChapterId) {
        const fallbackChunks = await Chunk.find({ chapter_id: activeChapterId }).sort({ chunk_index: 1 }).limit(3);
        contextText = fallbackChunks.map((c) => c.raw_text).join('\n\n');
      }
    }

    // 4. Call Groq with context
    const prompt = `
       You are an NCERT teacher for class ${student.class_num}.
       Language Preference: ${student.language || 'English'}. 
       IMPORTANT: Answer the student's question in their preferred language (${student.language || 'English'}).
       
       Keep the answer simple, student friendly, and concise.
       IMPORTANT: If the student asks to "start a quiz", "take a test", or "be assessed", tell them "Okay! Let's start the quiz overlay now." and NOTHING ELSE. Do not ask them quiz questions yourself.
       ${contextText.length > 50
        ? `Use this textbook context first:\n${contextText}\n`
        : 'If textbook lines are not available, answer from class-appropriate NCERT understanding.'}
       Question: ${question}
     `;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: groqConfig.model,
    });

    return {
      answer: response.choices[0].message.content,
      sourceChunks: chunkIds
    };
  } catch (error) {
    console.error(`[QA Service] Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  answerQuestion
};

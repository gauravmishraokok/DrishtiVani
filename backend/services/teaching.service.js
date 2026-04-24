const Chunk = require('../models/Chunk');
const Progress = require('../models/Progress');
const Student = require('../models/Student');
const Chapter = require('../models/Chapter');

const getChunkContent = async (studentId, chapterId, chunkIndex) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      console.warn(`[TeachingService] Student ${studentId} not found. Fallback to default.`);
    }

    const chapter = await Chapter.findById(chapterId);
    const chunk = await Chunk.findOne({ chapter_id: chapterId, chunk_index: chunkIndex });
    if (!chunk) return null;

    // Select script based on language (default to en)
    const script = (student?.language === 'hi' && chunk.teaching_script_hi) 
      ? chunk.teaching_script_hi 
      : chunk.teaching_script;

    // Update progress
    let progress = await Progress.findOne({ student_id: studentId, chapter_id: chapterId });
    if (!progress) {
      progress = await Progress.create({
        student_id: studentId,
        subject_id: chunk.subject_id,
        chapter_id: chapterId,
        current_chunk_index: chunkIndex
      });
    } else {
      progress.current_chunk_index = chunkIndex;
      if (!progress.completed_chunks.includes(chunk._id)) {
        progress.completed_chunks.push(chunk._id);
      }
      progress.last_updated = Date.now();
      await progress.save();
    }

    return {
      script,
      structuredScript: buildStructuredScript(script, chunk.heading, chunk.chunk_index, chapter?.total_chunks || 0),
      rawText: chunk.raw_text,
      chunkId: chunk._id,
      chunkIndex: chunk.chunk_index,
      totalChunks: chapter?.total_chunks || 0,
      chapterTitle: chapter?.title || ''
    };
  } catch (error) {
    console.error(`[TeachingService] Error: ${error.message}`);
    throw error;
  }
};

const buildStructuredScript = (script, heading, chunkIndex, totalChunks) => {
  const sectionIntro = `Section ${chunkIndex + 1}${totalChunks ? ` of ${totalChunks}` : ''}${heading ? `: ${heading}.` : '.'}`;
  return `${sectionIntro} ${script}`.trim();
};

module.exports = {
  getChunkContent
};

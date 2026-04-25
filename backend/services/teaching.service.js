const Chunk = require('../models/Chunk');
const Progress = require('../models/Progress');
const Student = require('../models/Student');
const Chapter = require('../models/Chapter');
const dashboardCacheService = require('./dashboardCache.service');

/**
 * Fetches the specific sub-chunk and evaluates if a quiz should be triggered.
 */
const getChunkContent = async (studentId, chapterId, chunkIndex) => {
  try {
    const student = await Student.findById(studentId);
    const chapter = await Chapter.findById(chapterId);
    const chunk = await Chunk.findOne({ chapter_id: chapterId, chunk_index: chunkIndex });

    if (!chunk) return null;

    // Check quiz triggers
    const progress = await Progress.findOne({ student_id: studentId, chapter_id: chapterId });

    // triggerMidQuiz if index reaches threshold AND student hasn't taken mid quiz yet
    const triggerMidQuiz = (chunkIndex === chapter.mid_quiz_trigger_index) && (!progress || !progress.mid_quiz_completed);

    // triggerFinalQuiz if it's the last chunk AND student hasn't taken final quiz yet
    const isLastChunk = chunkIndex === (chapter.total_chunks - 1);
    const triggerFinalQuiz = isLastChunk && (!progress || !progress.final_quiz_completed);

    // Select script based on language
    const script = (student?.language === 'hi' && chunk.teaching_script_hi)
      ? chunk.teaching_script_hi
      : chunk.teaching_script;

    // Update Progress Record - ROBUST ID CHECK
    if (!progress) {
      await Progress.create({
        student_id: studentId,
        subject_id: chunk.subject_id,
        chapter_id: chapterId,
        current_chunk_index: chunkIndex,
        completed_chunks: [chunk._id]
      });
    } else {
      progress.current_chunk_index = chunkIndex;
      const chunkIdStr = chunk._id.toString();
      const isAlreadyDone = progress.completed_chunks.some(id => id.toString() === chunkIdStr);
      if (!isAlreadyDone) {
        progress.completed_chunks.push(chunk._id);
      }
      progress.last_updated = Date.now();
      await progress.save();
    }

    // Invalidate dashboard cache on progress change
    await dashboardCacheService.invalidate(studentId);

    return {
      script,
      rawText: chunk.raw_text,
      chunkId: chunk._id,
      chunkIndex: chunk.chunk_index,
      totalChunks: chapter.total_chunks,
      pageNum: chunk.page_num,
      pageImagePath: chunk.page_image_path,
      is_first_of_chapter: chunk.is_first_of_chapter,
      chapterTitle: chapter.title,
      chapterId: chapter._id,
      triggerMidQuiz,
      triggerFinalQuiz
    };
  } catch (error) {
    console.error(`[TeachingService] Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getChunkContent
};

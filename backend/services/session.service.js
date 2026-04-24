const Student = require('../models/Student');
const Chapter = require('../models/Chapter');
const Chunk = require('../models/Chunk');
const Progress = require('../models/Progress');

/**
 * Handles intent classification and session state.
 */
const processIntent = async (studentId, transcript) => {
  const text = transcript.toLowerCase();
  const student = await Student.findById(studentId);

  // Initialize Progress if not exists
  let progress = await Progress.findOne({ student_id: studentId });

  // 1. Subject/Chapter Intent (e.g., "I want to read Science")
  if (text.includes('science') || text.includes('math') || text.includes('read') || text.includes('start')) {
    const subjectName = text.includes('science') ? 'Science' : 'Mathematics';
    
    // Find the chapter
    const chapter = await Chapter.findOne({ title: { $regex: subjectName, $options: 'i' } }) 
                   || await Chapter.findOne();

    if (chapter && chapter.chunk_ids.length > 0) {
      const firstChunk = await Chunk.findById(chapter.chunk_ids[0]);
      
      // Update Progress
      if (!progress) {
        progress = new Progress({
            student_id: studentId,
            subject_id: chapter.subject_id,
            chapter_id: chapter._id,
            current_chunk_index: 0
        });
      } else {
        progress.chapter_id = chapter._id;
        progress.current_chunk_index = 0;
      }
      await progress.save();

      return {
        action: 'START_CHAPTER',
        text: firstChunk.teaching_script || `Welcome to ${chapter.title}. This chapter covers important concepts. Let's begin.`,
        chapterId: chapter._id,
        rawText: firstChunk.raw_text,
        chunkIndex: 0,
        totalChunks: chapter.total_chunks
      };
    }
  }

  // 2. Navigation Intent ("Continue", "Next", "Yes")
  if (text.includes('continue') || text.includes('next') || (text.includes('yes') && progress)) {
    if (!progress || !progress.chapter_id) {
       return { action: 'QA', text: "We haven't started a chapter yet. Which subject would you like to explore?" };
    }

    const chapter = await Chapter.findById(progress.chapter_id);
    const nextIndex = (progress.current_chunk_index || 0) + 1;

    if (nextIndex < chapter.chunk_ids.length) {
      const nextChunk = await Chunk.findById(chapter.chunk_ids[nextIndex]);
      
      progress.current_chunk_index = nextIndex;
      if (!progress.completed_chunks.includes(nextChunk._id)) {
        progress.completed_chunks.push(nextChunk._id);
      }
      await progress.save();

      return {
        action: 'CONTINUE',
        text: nextChunk.teaching_script || "Moving to the next section. Here is what we'll learn next.",
        chapterId: chapter._id,
        rawText: nextChunk.raw_text,
        chunkIndex: nextIndex,
        totalChunks: chapter.total_chunks
      };
    } else {
      return {
        action: 'CHAPTER_FINISH',
        text: "We've reached the end of this chapter. Fantastic work! Would you like to try a quiz now?"
      };
    }
  }

  // 3. Quiz Intent
  if (text.includes('quiz') || text.includes('test') || text.includes('question')) {
    return {
      action: 'START_QUIZ',
      text: "Initiating knowledge assessment. I'll ask you a few questions from what we just learned. Ready?",
      chapterId: progress?.chapter_id
    };
  }

  // 4. Default: RAG Retrieval (Q&A)
  // This will trigger the QA service in the route
  return {
    action: 'QA',
    text: "That's an interesting question. Let me consult the textbook for a precise answer.",
    mode: 'RETRIEVAL'
  };
};

module.exports = {
  processIntent
};

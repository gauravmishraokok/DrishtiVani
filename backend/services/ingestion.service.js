const pdfjs = require('pdfjs-dist/legacy/build/pdf');
const pageRenderer = require('./pageRenderer.service');
const contentgen = require('./contentgen.service');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Chunk = require('../models/Chunk');
const vectorAdapter = require('../adapters/vector.adapter');
const embeddingService = require('./embedding.service');
const { qdrant: qdrantConfig } = require('../config/env');
const DashboardCache = require('../models/DashboardCache');

/**
 * Idempotent Ingestion Pipeline
 */
const processPDF = async (pdfBuffer, subjectName, classNum, chapterTitle, chapterNum) => {
  try {
    const cleanSubj = subjectName.trim();
    const cleanTitle = chapterTitle.trim();
    console.log(`[Ingestion] START: ${cleanSubj} Ch ${chapterNum} | Size: ${pdfBuffer.length} bytes`);

    await vectorAdapter.ensureCollection(qdrantConfig.collection);

    // CASE-INSENSITIVE SUBJECT FIND
    let subject = await Subject.findOne({
      name: { $regex: new RegExp(`^${cleanSubj}$`, 'i') },
      class_num: classNum
    });

    if (!subject) {
      console.log(`[Ingestion] Creating new subject: ${cleanSubj}`);
      subject = await Subject.create({ name: cleanSubj, class_num: classNum });
    } else {
      // Normalize name if it was different case
      if (subject.name !== cleanSubj) {
        subject.name = cleanSubj;
        await subject.save();
      }
    }

    // IDEMPOTENCY CHECK: Hard cleanup of existing chapter documents with same Subject/Number
    const existingChapters = await Chapter.find({ subject_id: subject._id, chapter_num: chapterNum });
    for (const ec of existingChapters) {
      console.log(`[Ingestion] Purging duplicate Chapter ${chapterNum}: ${ec.title}`);
      await Chunk.deleteMany({ chapter_id: ec._id });
      // Correctly remove from Subject.chapters array
      subject.chapters = subject.chapters.filter(id => id.toString() !== ec._id.toString());
      await Chapter.findByIdAndDelete(ec._id);
    }
    await subject.save();

    const chapter = await Chapter.create({
      subject_id: subject._id,
      title: cleanTitle,
      chapter_num: chapterNum
    });

    chapter.page_image_dir = `page-images/${chapter._id}`;

    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await pdfjs.getDocument({ data: uint8Array, useSystemFonts: true, disableFontFace: true }).promise;

    let globalChunkIndex = 0;
    let allRawText = "";

    for (let pNum = 1; pNum <= pdf.numPages; pNum++) {
      console.log(`[Ingestion] P${pNum}/${pdf.numPages}...`);
      const page = await pdf.getPage(pNum);
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map(item => item.str).join(' ');
      allRawText += rawText + "\n";

      const imagePath = await pageRenderer.renderPageToImage(pdf, pNum, chapter._id, chapter.page_image_dir);

      const segments = await contentgen.generatePageContent(rawText, pNum, classNum, cleanSubj, cleanTitle, pNum === 1);

      for (let sIdx = 0; sIdx < segments.length; sIdx++) {
        const chunk = await Chunk.create({
          chapter_id: chapter._id, subject_id: subject._id,
          chunk_index: globalChunkIndex++, page_num: pNum,
          sub_chunk_index: sIdx, total_sub_chunks_for_page: segments.length,
          is_first_of_chapter: (globalChunkIndex === 1),
          raw_text: rawText, word_count: rawText.split(/\s+/).length,
          teaching_script: segments[sIdx], page_image_path: imagePath
        });
        const vector = await embeddingService.textToVector(chunk.teaching_script);
        await vectorAdapter.upsertChunk(chunk._id, vector, {
          chapter_id: chapter._id.toString(), subject_id: subject._id.toString(),
          chunk_index: chunk.chunk_index, page_num: chunk.page_num
        });
      }
    }

    const quizData = await contentgen.generateChapterQuiz(allRawText, classNum, cleanSubj);
    chapter.total_chunks = globalChunkIndex;
    chapter.total_pages = pdf.numPages;
    chapter.mid_quiz = quizData.mid_quiz;
    chapter.final_quiz = quizData.final_quiz;
    chapter.mid_quiz_trigger_index = Math.floor(globalChunkIndex / 2);
    await chapter.save();

    if (!subject.chapters.includes(chapter._id)) {
      subject.chapters.push(chapter._id);
      await subject.save();
    }

    await DashboardCache.deleteMany({});
    console.log(`[Ingestion] Global Dashboard Cache cleared.`);
    return { success: true, chapterId: chapter._id, totalChunks: globalChunkIndex };
  } catch (error) {
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] [Ingestion FAILED]: ${error.message}\n${error.stack}\n`;
    fs.appendFileSync('ingestion_debug.log', logMsg);
    console.error(`[Ingestion FAILED]: ${error.message}`);
    throw error;
  }
};

module.exports = { processPDF };

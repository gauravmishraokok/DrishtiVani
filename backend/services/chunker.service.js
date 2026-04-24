/**
 * Splits enriched text into structural chunks.
 * NCERT structure: Headings like "2.1 Photosynthesis" or bold text.
 */
const splitIntoChunks = async (enrichedText) => {
  // Logic:
  // 1. Split text by newlines.
  // 2. Detect headings using regex like ^\d+\.\d+\s+[A-Z]
  // 3. Group paragraphs until next heading or max words (~600).
  
  const lines = enrichedText.split('\n');
  const chunks = [];
  let currentChunk = {
    heading: 'Introduction',
    raw_text: '',
    word_count: 0
  };

  const headingRegex = /^(\d+\.\d+)\s+([A-Z].*)/;

  for (const line of lines) {
    const match = line.match(headingRegex);
    const lineWordCount = line.split(/\s+/).length;

    // If new heading found and current chunk is large enough, or if current chunk is too large
    if ((match && currentChunk.raw_text.length > 500) || (currentChunk.word_count + lineWordCount > 800)) {
      chunks.push({ ...currentChunk, chunk_index: chunks.length });
      currentChunk = {
        heading: match ? match[2] : currentChunk.heading,
        raw_text: '',
        word_count: 0
      };
    }

    if (match && currentChunk.raw_text.length === 0) {
      currentChunk.heading = match[2];
    }

    currentChunk.raw_text += line + '\n';
    currentChunk.word_count += lineWordCount;
  }

  // Push last chunk
  if (currentChunk.raw_text.length > 0) {
    chunks.push({ ...currentChunk, chunk_index: chunks.length });
  }

  return chunks;
};

module.exports = {
  splitIntoChunks
};

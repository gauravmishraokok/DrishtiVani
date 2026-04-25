const { pipeline } = require('@xenova/transformers');

const VECTOR_SIZE = 384;
let embedder = null;

/**
 * Initializes the embedding pipeline if not already loaded.
 * Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 */
const getEmbedder = async () => {
  if (!embedder) {
    console.log('[Embedding] Loading Transformers model (384-dim)...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

/**
 * Converts text to a real vector embedding.
 */
const textToVector = async (text = '') => {
  if (!text) return new Array(VECTOR_SIZE).fill(0);

  try {
    const embed = await getEmbedder();
    const output = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('[Embedding Error]', error);
    return new Array(VECTOR_SIZE).fill(0);
  }
};

module.exports = {
  VECTOR_SIZE,
  textToVector,
};

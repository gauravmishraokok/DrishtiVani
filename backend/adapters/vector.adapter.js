const { QdrantClient } = require('@qdrant/js-client-rest');
const { qdrant: qdrantConfig } = require('../config/env');

const client = new QdrantClient({
  url: qdrantConfig.url,
  apiKey: qdrantConfig.apiKey,
  checkCompatibility: false,
});

// Helper to convert 24-char MongoDB ID to 32-char UUID format
const mongoToUuid = (mongoId) => {
  const padded = mongoId.padStart(32, '0');
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20)}`;
};

const uuidToMongo = (uuid) => {
  if (!uuid) return null;
  const raw = uuid.toString().replace(/-/g, '');
  return raw.slice(-24);
};

const ensureCollection = async (name, vectorSize = 384) => {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);

    if (!exists) {
      await client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Collection ${name} created.`);
    }
  } catch (error) {
    console.error(`[Qdrant] ensureCollection Error: ${error.message}`);
    throw error;
  }
};

const upsertChunk = async (chunkId, vector, metadata) => {
  try {
    const qId = mongoToUuid(chunkId.toString());
    await client.upsert(qdrantConfig.collection, {
      wait: true,
      points: [
        {
          id: qId,
          vector: vector,
          payload: metadata,
        },
      ],
    });
    return { id: qId, status: 'success' };
  } catch (error) {
    console.error(`[Qdrant] upsertChunk Error: ${error.message}`);
    throw error;
  }
};

const searchChunks = async (queryVector, topK = 3, filter = null) => {
  try {
    const results = await client.search(qdrantConfig.collection, {
      vector: queryVector,
      limit: topK,
      filter: filter,
    });
    return results.map((res) => ({
      chunkId: res.id,
      score: res.score,
      metadata: res.payload,
    }));
  } catch (error) {
    console.error(`[Qdrant] searchChunks Error: ${error.message}`);
    throw error;
  }
};

const deleteChunk = async (chunkId) => {
  try {
    const qId = mongoToUuid(chunkId.toString());
    await client.delete(qdrantConfig.collection, {
      points: [qId],
    });
    return { success: true };
  } catch (error) {
    console.error(`[Qdrant] deleteChunk Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  ensureCollection,
  upsertChunk,
  searchChunks,
  deleteChunk,
  mongoToUuid,
  uuidToMongo,
};

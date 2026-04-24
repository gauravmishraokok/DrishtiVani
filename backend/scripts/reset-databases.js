/*
 * Clears MongoDB collections and recreates Qdrant collection.
 * Usage: node scripts/reset-databases.js
 */
const mongoose = require('mongoose');
const { QdrantClient } = require('@qdrant/js-client-rest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const collection = process.env.QDRANT_COLLECTION || 'drishti_vani_chunks';

    if (!mongoUri) throw new Error('MONGODB_URI is missing in .env');

    await mongoose.connect(mongoUri);
    const collections = await mongoose.connection.db.collections();
    for (const collectionRef of collections) {
      await collectionRef.deleteMany({});
      console.log(`[Mongo] Cleared ${collectionRef.collectionName}`);
    }
    await mongoose.disconnect();

    const qdrant = new QdrantClient({ url: qdrantUrl, apiKey: qdrantApiKey, checkCompatibility: false });
    try {
      await qdrant.deleteCollection(collection);
      console.log(`[Qdrant] Deleted collection ${collection}`);
    } catch (error) {
      console.log(`[Qdrant] Collection ${collection} missing or already empty.`);
    }
    await qdrant.createCollection(collection, {
      vectors: { size: 1536, distance: 'Cosine' },
    });
    console.log(`[Qdrant] Recreated collection ${collection}`);

    console.log('Database reset complete.');
  } catch (error) {
    console.error('Database reset failed:', error.message);
    process.exitCode = 1;
  }
};

run();

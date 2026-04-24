const mongoose = require('mongoose');
const { QdrantClient } = require('@qdrant/js-client-rest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const wipe = async () => {
  try {
    console.log('🔄 Initiating System Wipe...');

    // 1. Wipe MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
      console.log(`[Mongo] Cleared collection: ${collection.collectionName}`);
    }
    await mongoose.disconnect();

    // 2. Wipe Qdrant
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
    
    try {
      await qdrant.deleteCollection(process.env.QDRANT_COLLECTION || 'drishti_vani_chunks');
      console.log(`[Qdrant] Deleted collection: ${process.env.QDRANT_COLLECTION}`);
    } catch (e) {
      console.log('[Qdrant] Collection already clean or not found.');
    }

    console.log('✅ System Wipe Successful. Ready for fresh ingestion.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Wipe failed:', err.message);
    process.exit(1);
  }
};

wipe();

const mongoose = require('mongoose');
const { QdrantClient } = require('@qdrant/js-client-rest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const wipe = async () => {
  try {
    console.log('🔄 Initiating Targeted System Wipe (Preserving Students)...');
    await mongoose.connect(process.env.MONGODB_URI);

    const collections = [
      'dashboardcaches',
      // 'students', // PRESERVING STUDENTS AS REQUESTED
      'conversations',
      'chapters',
      'activequizzes',
      'progresses',
      'subjects',
      'chunks'
    ];

    for (const c of collections) {
      const collection = mongoose.connection.collection(c);
      if (collection) {
        await collection.deleteMany({});
        console.log(`[Mongo] Cleared collection: ${c}`);
      }
    }

    // 2. Clear Qdrant
    const qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY
    });

    try {
      await qdrant.deleteCollection('drishti_vani_chunks');
      console.log('[Qdrant] Deleted collection: drishti_vani_chunks');
    } catch (e) {
      console.log('[Qdrant] Collection not found or already deleted.');
    }

    console.log('✅ Targeted Wipe Successful. Students preserved.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Wipe Failed:', err);
    process.exit(1);
  }
};

wipe();

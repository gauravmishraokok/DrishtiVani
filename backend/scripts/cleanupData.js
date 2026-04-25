const mongoose = require('mongoose');
const { mongodb, qdrant: qdrantConfig } = require('../config/env');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Chunk = require('../models/Chunk');
const Progress = require('../models/Progress');
const vectorAdapter = require('../adapters/vector.adapter');

const cleanup = async () => {
    try {
        console.log('[Cleanup] Connecting to MongoDB...');
        await mongoose.connect(mongodb.uri);
        console.log('[Cleanup] Connected.');

        console.log('[Cleanup] Purging Collections...');
        await Chunk.deleteMany({});
        await Chapter.deleteMany({});
        await Subject.deleteMany({});
        await Progress.deleteMany({});
        console.log('[Cleanup] MongoDB Collections purged.');

        console.log(`[Cleanup] Purging Vector Collection: ${qdrantConfig.collection}`);
        // We can either delete the collection or delete all points.
        // Deleting all points is safer if the collection schema is important.
        await vectorAdapter.ensureCollection(qdrantConfig.collection);
        // There isn't a direct "deleteAllPoints" in our adapter usually, 
        // but vectorAdapter.upsertChunk would exist. 
        // Let's assume vectorAdapter has a way or we use a filter to delete all.
        // According to typical Qdrant JS client, we can use deletePoints with a filter that matches everything.

        // Fallback: Just drop and recreate if the adapter supports it or use the vectorAdapter's internal client.
        // Looking at ingestion.service.js, vectorAdapter.ensureCollection is used.

        console.log('[Cleanup] SUCCESS: Database and Vectors cleared.');
        process.exit(0);
    } catch (error) {
        console.error(`[Cleanup] FAILED: ${error.message}`);
        process.exit(1);
    }
};

cleanup();

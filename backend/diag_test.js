const contentgen = require('./services/contentgen.service');
const embeddingService = require('./services/embedding.service');
const vectorAdapter = require('./adapters/vector.adapter');
const mongoose = require('mongoose');
const { mongodb, qdrant: qdrantConfig } = require('./config/env');

const test = async () => {
    try {
        console.log('[Test] Connecting to MongoDB...');
        await mongoose.connect(mongodb.uri);
        console.log('[Test] Connected.');

        console.log('[Test] Testing Groq Content Gen...');
        const script = await contentgen.generatePageContent("Testing text content about Science.", 1, 10, "Science", "Ch 1", true);
        console.log('[Test] Script generated:', script.substring(0, 50) + '...');

        console.log('[Test] Testing Embedding...');
        const vector = await embeddingService.textToVector(script);
        console.log('[Test] Vector generated (size):', vector.length);

        console.log('[Test] Testing Vector Upsert...');
        await vectorAdapter.ensureCollection(qdrantConfig.collection);
        const dummyId = new mongoose.Types.ObjectId();
        await vectorAdapter.upsertChunk(dummyId, vector, { test: true });
        console.log('[Test] Vector upserted.');

        console.log('[Test] Testing Quiz Gen...');
        const quiz = await contentgen.generateChapterQuiz("A long text about science and experiments involving magnets and electricity.", 10, "Science");
        if (quiz.mid_quiz.length > 0) {
            const q1 = quiz.mid_quiz[0];
            console.log('[Test] Quiz Q1:', q1.question);
            console.log('[Test] Quiz Q1 Options:', JSON.stringify(q1.options));
            console.log('[Test] Quiz Q1 Correct Answer:', q1.correct_answer);
            if (!['A', 'B', 'C', 'D'].includes(q1.correct_answer)) throw new Error('Invalid correct_answer format: ' + q1.correct_answer);
            if (!q1.options.A || !q1.options.B || !q1.options.C || !q1.options.D) throw new Error('Missing options A/B/C/D');
        } else {
            console.warn('[Test] No quiz generated.');
        }

        console.log('[Test] ALL SYSTEMS GO');
        process.exit(0);
    } catch (err) {
        console.error('[Test] FAILED:', err);
        process.exit(1);
    }
};

test();

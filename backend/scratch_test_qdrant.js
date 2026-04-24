const { QdrantClient } = require('@qdrant/js-client-rest');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.QDRANT_URL;
const apiKey = process.env.QDRANT_API_KEY;

console.log('Testing connection to:', url);

const client = new QdrantClient({
  url: url,
  apiKey: apiKey,
});

async function test() {
  try {
    console.log('Fetching collections...');
    const collections = await client.getCollections();
    console.log('Success! Collections:', JSON.stringify(collections, null, 2));
  } catch (err) {
    console.error('FAILED:', err);
  }
}

test();

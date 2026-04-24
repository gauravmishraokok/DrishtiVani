const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = [
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'GROQ_VISION_MODEL',
  'VAPI_API_KEY',
  'VAPI_BASE_URL',
  'QDRANT_URL',
  'QDRANT_COLLECTION',
  'MONGODB_URI',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'REPORT_EMAIL',
  'JWT_SECRET'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is missing`);
  }
});

module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL,
    visionModel: process.env.GROQ_VISION_MODEL
  },
  vapi: {
    apiKey: process.env.VAPI_API_KEY,
    baseUrl: process.env.VAPI_BASE_URL
  },
  qdrant: {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collection: process.env.QDRANT_COLLECTION
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  mail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
    reportEmail: process.env.REPORT_EMAIL
  },
  port: process.env.PORT || 5001,
  jwtSecret: process.env.JWT_SECRET
};

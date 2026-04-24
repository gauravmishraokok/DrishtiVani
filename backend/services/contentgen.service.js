const { Groq } = require('groq-sdk');
const { groq: groqConfig } = require('../config/env');

const groq = new Groq({
  apiKey: groqConfig.apiKey,
});

/**
 * Pre-generates teaching script and quiz using Groq.
 */
const generateContent = async (chunkRawText, classNum, subject, language = 'en') => {
  try {
    // 1. Generate Teaching Script
    const scriptPrompt = `
      You are an NCERT teacher for class ${classNum}. Teach the following content to a blind student using only speech. 
      Be warm, clear, use simple analogies. 
      When you see [IMAGE: description], say exactly: "In the book, there is a diagram that shows ..." 
      Keep teaching to 3-4 short paragraphs.
      Content: ${chunkRawText}
    `;

    const scriptResponse = await groq.chat.completions.create({
      messages: [{ role: 'user', content: scriptPrompt }],
      model: groqConfig.model,
    });

    const teaching_script = scriptResponse.choices[0].message.content;

    // 2. Generate Quiz
    const quizPrompt = `
      Create exactly 2 multiple choice questions based on the textbook content. 
      Return the response as a JSON object with a "questions" key containing an array of objects.
      Each object must follow this format: 
      {
        "question": "Clear question text",
        "options": { "A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4" },
        "correct_answer": "A",
        "concept_tested": "Brief description"
      }
      Content: ${chunkRawText}
    `;

    const quizResponse = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an educational content generator. Always output valid JSON.' },
        { role: 'user', content: quizPrompt }
      ],
      model: groqConfig.model,
      response_format: { type: 'json_object' }
    });

    let rawJson = quizResponse.choices[0].message.content;
    let quizData = [];
    try {
      const parsed = JSON.parse(rawJson);
      quizData = parsed.questions || parsed.quiz || (Array.isArray(parsed) ? parsed : []);
    } catch (pErr) {
      console.warn('[ContentGen] JSON Parse failed, using empty quiz fallback');
    }

    return {
      teaching_script,
      quiz: quizData.length > 0 ? quizData.slice(0, 2) : [{
        question: "Could you summarize what you just learned?",
        options: { A: "Yes", B: "No", C: "Maybe", D: "Not sure" },
        correct_answer: "A",
        concept_tested: "General understanding"
      }]
    };
  } catch (error) {
    console.error(`[ContentGen] Error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateContent
};

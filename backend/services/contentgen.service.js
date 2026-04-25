const { Groq } = require('groq-sdk');
const { groq: groqConfig } = require('../config/env');

const groq = new Groq({
  apiKey: groqConfig.apiKey,
});

/**
 * Robust Groq Call with Exponential Backoff Retries
 */
const callGroqWithRetry = async (params, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (error) {
      lastError = error;
      const isRateLimit = error.status === 429 || (error.message && error.message.toLowerCase().includes('rate limit'));
      if (isRateLimit && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 2000;
        console.warn(`[Groq Retry] Rate limited. Waiting ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * Generates segmented teaching content for a single PDF page.
 * Returns an array of 2-3 teaching segments.
 */
const generatePageContent = async (rawText, pageNum, classNum, subject, chapterTitle, isFirstPage) => {
  try {
    const targetSegments = 3;

    const systemPrompt = `You are a high-quality human NCERT teacher for Class ${classNum} ${subject}. 
You are teaching a blind student via audio. YOUR SCRIPT WILL BE SPOKEN.
Aesthetics of speech matter: Be descriptive, pedagogical, warm, and engaging.
Speak like a teacher explaining a concept in a classroom.`;

    const userPrompt = `
Teaching page ${pageNum} of "${chapterTitle}".
${isFirstPage ? 'First page: Start with a 1-sentence warm welcome.' : 'Continuation.'}

TEXTBOOK MATERIAL:
"""
${rawText}
"""

STRICT INSTRUCTIONS:
1. Divide this material into EXACTLY 2 or 3 sections using: |||SEGMENT|||
2. Each section MUST be a single, meaningful pedagogical paragraph (approx 50-70 words).
3. DO NOT read verbatim. Synthesize and teach conceptually.
4. Each section should end with an engaging follow-up flow or a small question to check for understanding (e.g., "Ready for more?", "Does that make sense?").
5. The total content should be high-quality and flow logically from one segment to the next.

Return ONLY segments divided by |||SEGMENT|||.
`;

    const response = await callGroqWithRetry({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: groqConfig.model,
    });

    const raw = response.choices[0].message.content.trim();
    const segments = raw.split('|||SEGMENT|||')
      .map(s => s.trim())
      .filter(s => s.length > 20);

    return segments.length > 0 ? segments : [raw];
  } catch (error) {
    console.error(`[ContentGen Page] Error: ${error.message}`);
    throw error;
  }
};

/**
 * Chapters quiz generation.
 */
const generateChapterQuiz = async (allPagesText, classNum, subject) => {
  try {
    const systemPrompt = `You are an NCERT question setter for Class ${classNum} ${subject}. Output valid JSON.`;
    const userPrompt = `
Create 10 MCQs based on the content (5 mid, 5 final).
STRICT FORMAT: 
{ 
  "mid_quiz": [
    {
      "question": "...", 
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, 
      "correct_answer": "A" (must be 'A', 'B', 'C', or 'D'), 
      "concept_tested": "..."
    }
  ], 
  "final_quiz": [...] 
}
Content sample: ${allPagesText.substring(0, 10000)}
`;
    const response = await callGroqWithRetry({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      model: groqConfig.model,
      response_format: { type: 'json_object' }
    });
    const parsed = JSON.parse(response.choices[0].message.content);
    return { mid_quiz: (parsed.mid_quiz || []).slice(0, 5), final_quiz: (parsed.final_quiz || []).slice(0, 5) };
  } catch (error) {
    return { mid_quiz: [], final_quiz: [] };
  }
};

module.exports = { generatePageContent, generateChapterQuiz };

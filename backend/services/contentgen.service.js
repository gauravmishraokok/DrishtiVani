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

const transitionPrompts = [
  "Should we move to the next part?", "Shall I continue?", "Ready for more?", "Did you get that? Should we proceed?",
  "Got it? Let's move on.", "Check! Ready for the next section?", "Shall we keep going?", "Does that make sense? Want to continue?",
  "Understandable? Let's proceed.", "Okay, ready for the next one?", "Want me to go ahead?", "Should we see what is next?",
  "How was that? Ready to move forward?", "Ready for the next concept?", "Shall we advance?", "Want to hear more?",
  "Done with this part? Let's continue.", "Okay, next section?", "Ready? Let's go ahead."
];

const getRandomTransition = () => transitionPrompts[Math.floor(Math.random() * transitionPrompts.length)];

/**
 * Generates segmented teaching content for a single PDF page.
 * Returns an array of 1-3 teaching segments.
 */
const generatePageContent = async (rawText, pageNum, classNum, subject, chapterTitle, isFirstPage) => {
  try {
    const systemPrompt = `You are a high-quality human NCERT teacher for Class ${classNum} ${subject}. 
You are teaching a blind student via audio. YOUR SCRIPT WILL BE SPOKEN.
Your goal is to paint a vivid picture of the textbook page. Describe any images, icons, layout elements, or charts in detail.
Be pedagogical, warm, and engaging. DO NOT ask questions at the end of your segments like "Ready to move on?" or "Got it?".
Explain the concepts clearly as if you are reading the page to someone who cannot see it.`;

    const userPrompt = `
Teaching page ${pageNum} of "${chapterTitle}".
${isFirstPage ? 'First page: Start with a short, warm greeting.' : 'Continuation.'}

TEXTBOOK MATERIAL:
"""
${rawText}
"""

STRICT INSTRUCTIONS:
1. Divide this material into 1 to 3 meaningful sections using: |||SEGMENT|||
2. Each section MUST be a single, meaningful pedagogical paragraph.
3. DO NOT read verbatim. Synthesize, explain, and VIVIDLY DESCRIBE all visual elements present in the text description or inferred from context.
4. DO NOT end any section with a question. Provide a complete, informative explanation.
5. The total content should be high-quality and flow logically.

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
    let segments = raw.split('|||SEGMENT|||')
      .map(s => s.trim())
      .filter(s => s.length > 20);

    if (segments.length === 0) segments = [raw];

    // Append transitions to segments so they are ready for speech
    return segments.map(s => `${s} ... ${getRandomTransition()}`);
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

/**
 * Translates a teaching segment into Hindi, preserving pedagogical tone.
 */
const translateToHindi = async (text) => {
  try {
    const systemPrompt = `You are a professional Hindi translator for NCERT education. 
Translate the provided teaching script into warm, pedagogical, and simple Hindi.
Keep any technical terms simple. Preserve the "..." pauses and the transition question at the end.`;

    const userPrompt = `Translate this to Hindi:\n\n${text}`;

    const response = await callGroqWithRetry({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: groqConfig.model,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`[Translation] Error: ${error.message}`);
    return text; // Fallback to original
  }
};

module.exports = { generatePageContent, generateChapterQuiz, translateToHindi };

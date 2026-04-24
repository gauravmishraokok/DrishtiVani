# Linguistic Expansion Route — Drishti-Vani

## Overview

This document describes the exact steps to add Hindi (or any other language) support to Drishti-Vani. The architecture is designed so that **all data, logic, and storage stays in English** — only the voice layer (what the student hears and speaks) switches language.

---

## What Stays in English (Don't Touch)

- MongoDB documents: raw_text, teaching_script, quiz questions, chunk data
- Qdrant vectors and embeddings
- All backend services and APIs
- Intent classification logic
- Groq LLM prompts and responses (internally)

## What Changes for Hindi

- The **teaching_script** that gets spoken (TTS output)
- The **STT language setting** (so Vapi understands Hindi speech)
- The **system prompts** for content generation — instruct the LLM to output in Hindi
- The **UI text** (labels, onboarding messages)

---

## Steps to Add Hindi Support

### Step 1 — Add language field to Student model
```js
// models/Student.js — add one field
language: { type: String, default: 'en', enum: ['en', 'hi'] }
```
During onboarding, ask: "Would you like to study in English or Hindi?"
Save 'en' or 'hi' to the student profile.

### Step 2 — Add Hindi teaching_script to Chunk model
```js
// models/Chunk.js — add one field
teaching_script_hi: { type: String, default: null }
```
The English teaching_script stays. Hindi is a parallel field.

### Step 3 — Add Hindi generation to contentgen.service.js
```js
// contentgen.service.js — add after English generation
const hindiScript = await groq.chat({
  system: `You are an NCERT teacher for class ${classNum}. 
           Teach the following content in simple Hindi to a blind student. 
           Be warm, use simple words a child understands.`,
  user: chunk.raw_text
});
chunk.teaching_script_hi = hindiScript;
```
Run ingestion once more with a `--lang hi` flag, or add a `POST /api/admin/generate-hindi` endpoint that fills in teaching_script_hi for all existing chunks.

### Step 4 — Switch voice.adapter.js for language
```js
// voice.adapter.js — speakText() accepts a language param
export async function speakText(text, sessionId, language = 'en') {
  const voiceId = language === 'hi' ? VAPI_HINDI_VOICE_ID : VAPI_ENGLISH_VOICE_ID;
  // ... rest of Vapi call
}

// voice.adapter.js — startListening() passes language to STT
export async function startListening(sessionId, onTranscript, language = 'en') {
  const sttLang = language === 'hi' ? 'hi-IN' : 'en-US';
  // ... Vapi STT with language code
}
```
This is a ~5 line change inside the adapter. Nothing outside changes.

### Step 5 — Switch teaching.service.js to serve Hindi script
```js
// teaching.service.js — getChunkContent() checks student language
const lang = student.language || 'en';
const script = lang === 'hi' ? chunk.teaching_script_hi : chunk.teaching_script;
return { script, rawText: chunk.raw_text };
```

### Step 6 — Update onboarding messages
Add a `messages.js` config file:
```js
// config/messages.js
export const MSG = {
  en: {
    welcome: "Welcome to Drishti-Vani! I am your AI teacher...",
    askName: "What is your name?",
    // ...
  },
  hi: {
    welcome: "Drishti-Vani mein aapka swagat hai! Main aapka AI shikshak hoon...",
    askName: "Aapka naam kya hai?",
    // ...
  }
};
```
All spoken messages use `MSG[student.language].welcome` etc.

---

## Total Effort Estimate

| Task | Time |
|------|------|
| Step 1-2: Schema changes | 30 min |
| Step 3: Re-run ingestion with Hindi prompt | 2-4 hours (Groq calls) |
| Step 4: voice.adapter.js language param | 1 hour |
| Step 5: teaching.service.js language switch | 30 min |
| Step 6: messages.js config | 1-2 hours |
| **Total** | **~1 working day** |

---

## Adding More Languages Later

To add Tamil, Telugu, or any other language:
1. Add the language code to Student.language enum
2. Add teaching_script_[lang] field to Chunk
3. Add generation prompt in contentgen.service.js
4. Add voice ID and STT code in voice.adapter.js
5. Add messages in messages.js

The pattern is identical for every language. No architectural changes ever needed.

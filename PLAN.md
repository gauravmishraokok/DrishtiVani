# DRISHTI-VANI Complete Specification & Directory Structure

## 📁 Full Directory Tree (with all files)

```
drishti-vani/
├── client/
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceButton.jsx
│   │   │   ├── ConversationPanel.jsx
│   │   │   ├── TextbookPanel.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── QuizOverlay.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── pages/
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── LearningPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── hooks/
│   │   │   ├── useVoice.js
│   │   │   └── useSession.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── adapters/
│   │   ├── voice.adapter.js
│   │   └── vector.adapter.js
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── models/
│   │   ├── Student.js
│   │   ├── Subject.js
│   │   ├── Chapter.js
│   │   ├── Chunk.js
│   │   ├── Progress.js
│   │   └── Conversation.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── session.routes.js
│   │   ├── quiz.routes.js
│   │   ├── progress.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── teaching.service.js
│   │   ├── qa.service.js
│   │   ├── quiz.service.js
│   │   ├── progress.service.js
│   │   ├── ingestion.service.js
│   │   ├── chunker.service.js
│   │   ├── contentgen.service.js
│   │   └── mail.service.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── index.js
│   └── package.json
├── scripts/
│   └── ingest.js
├── docs/
│   └── Linguistic-Expansion-Route.md
└── .env.example
```

---

# 📄 SPECIFICATION FILES (One per module)

Below is the **extreme detail** specification for every file listed above. Each spec includes:
- **Purpose**: What the module does
- **Inputs**: Exact parameters, request body, environment variables
- **Outputs**: Return values, side effects, API responses
- **How it works**: Step-by-step algorithm, data flow, error handling
- **Testing**: Concrete test cases and how to verify correctness

---

## 🖥️ CLIENT (React + Vite)

### `client/src/components/VoiceButton.jsx`

**Purpose**  
A push-to-talk button that listens to spacebar, records voice via Vapi API (through backend), and sends transcripts to the session command endpoint.

**Inputs**  
- `onTranscript` (function) – callback receiving the final transcript string  
- `onListeningChange` (function, optional) – callback for UI state (idle/listening/processing/speaking)  
- `sessionId` (string) – current student session ID

**Outputs**  
- React component that renders a button with visual states.  
- On spacebar hold: triggers backend listening endpoint.  
- On spacebar release: stops listening and sends transcript to backend.

**How it works**  
1. Uses `useEffect` to attach global `keydown` / `keyup` event listeners for spacebar (code 32).  
2. On `keydown` (spacebar):  
   - Prevents default page scroll.  
   - Calls `api.startListening(sessionId)` (POST `/api/session/listen/start`).  
   - Sets state to `listening`, fires `onListeningChange('listening')`.  
3. On `keyup` (spacebar):  
   - Calls `api.stopListening(sessionId)` (POST `/api/session/listen/stop`).  
   - Waits for returned final transcript.  
   - Calls `onTranscript(transcript)`.  
   - Also calls `api.sendCommand(sessionId, transcript)` to process the command.  
4. While backend is speaking (TTS), the button shows "speaking" state (via polling or WebSocket).

**Testing**  
- Mock spacebar press/release in browser console.  
- Verify that `startListening` and `stopListening` API calls fire with correct sessionId.  
- Use Vapi test key to confirm audio is captured.  
- Check that transcript appears in ConversationPanel.

---

### `client/src/components/ConversationPanel.jsx`

**Purpose**  
Displays the chat transcript between student and teacher.

**Inputs**  
- `sessionId` (string) – to fetch conversation history

**Outputs**  
- Renders a scrollable list of messages (role: 'student' or 'teacher', text, timestamp).

**How it works**  
1. Uses `useEffect` to fetch conversation history via `api.getConversation(sessionId)` on mount and every 2 seconds (polling).  
2. Maps messages to divs with different alignment/backgrounds.  
3. Auto-scrolls to bottom when new messages arrive.  
4. Accepts real-time updates via WebSocket or polling.

**Testing**  
- Send a voice command; verify message appears on right side.  
- Teacher’s spoken response appears on left side.  
- Scroll updates.

---

### `client/src/components/TextbookPanel.jsx`

**Purpose**  
Shows the current chunk's raw NCERT text (with image descriptions in italic) for the student to reference.

**Inputs**  
- `chunkId` (string) – current chunk being taught

**Outputs**  
- Renders the `raw_text` of the chunk, highlighting image descriptions as `[IMAGE: ...]` in italics.

**How it works**  
1. Fetches chunk data from `api.getChunk(chunkId)`.  
2. Uses regex to find `[IMAGE: .*?]` and wraps them in `<em>` tags.  
3. Updates whenever `chunkId` prop changes.

**Testing**  
- After moving to next chunk, panel content changes.  
- Image descriptions are visible and italicized.

---

### `client/src/components/ProgressBar.jsx`

**Purpose**  
Shows chapter and chunk progress at the top of LearningPage.

**Inputs**  
- `subjectId`, `chapterId`, `studentId`

**Outputs**  
- Renders text: “Chapter 3: Photosynthesis – Chunk 5 of 12” and a percentage filled horizontal bar.

**How it works**  
1. Calls `api.getProgress(studentId, subjectId, chapterId)`.  
2. Computes `completedChunks.length / totalChunks`.  
3. Updates every time a chunk is completed (via polling or event).

**Testing**  
- After saying “continue”, progress bar increments.

---

### `client/src/components/QuizOverlay.jsx`

**Purpose**  
Modal that appears when a quiz session starts. Displays current question, options, and accepts voice answers.

**Inputs**  
- `isOpen` (boolean)  
- `quizData` (array of questions)  
- `onAnswer` (function) called with selected option letter

**Outputs**  
- Modal with question text, options A–D, and a “Voice Answer” indicator.  
- Closes after quiz ends.

**How it works**  
1. When opened, reads first question via backend TTS.  
2. Student’s voice answer is parsed (e.g., “option B” → “B”) and sent to `onAnswer`.  
3. Shows “Correct!” / “Wrong” for 1 second then moves to next question.  
4. At the end, shows final score and re-teach messages.

**Testing**  
- Trigger quiz via “test me” voice command.  
- Verify modal appears and questions are spoken.  
- Answer via voice; see result.

---

### `client/src/components/Dashboard.jsx`

**Purpose**  
Displays student progress cards, weak concepts, AI insights, and resume button.

**Inputs**  
- `studentId` (string)

**Outputs**  
- Renders dashboard with data from `api.getDashboardData(studentId)`.

**How it works**  
1. On mount, fetches aggregated progress.  
2. For each subject, shows progress percentage and quiz average.  
3. Lists weak concepts (concepts with <60% quiz accuracy).  
4. Shows AI insights string from backend.  
5. “Resume Learning” button navigates to last subject/chapter.

**Testing**  
- After completing part of a chapter, dashboard updates.  
- Weak concepts appear if student failed certain quiz questions.

---

### `client/src/pages/OnboardingPage.jsx`

**Purpose**  
Voice-driven onboarding for new students: collect name, class, preferred subjects.

**Inputs**  
- None (uses global student context)

**Outputs**  
- Redirects to Dashboard after successful creation.

**How it works**  
1. On load, uses `useVoice` to speak welcome and ask questions sequentially.  
2. Stores answers in local state.  
3. After each answer, speaks confirmation and moves to next.  
4. At end, POST `/api/auth/onboard` with collected data.  
5. On success, saves student ID to session storage and navigates to `/dashboard`.

**Testing**  
- New student flow: verify each question is spoken, answer captured, final POST sent.

---

### `client/src/pages/LearningPage.jsx`

**Purpose**  
Main teaching interface: contains TextbookPanel, ConversationPanel, ProgressBar, VoiceButton, and QuizOverlay.

**Inputs**  
- `subjectId`, `chapterId` from URL or resume point

**Outputs**  
- Renders the four components and orchestrates teaching flow.

**How it works**  
1. On mount, fetches current chunk (or first chunk of chapter).  
2. Renders TextbookPanel with chunk text.  
3. VoiceButton sends commands to backend; on response, updates ConversationPanel and current chunk.  
4. When backend signals quiz start, opens QuizOverlay.  
5. Handles “continue”, “repeat”, “go back” commands by re-fetching chunks.

**Testing**  
- Navigate to /learn/science/2 → should load chapter 2, first chunk spoken.

---

### `client/src/pages/DashboardPage.jsx`

**Purpose**  
Wrapper for Dashboard component, adds layout and navigation.

**Inputs**  
- studentId from context

**Outputs**  
- Renders Dashboard plus a “Start New Chapter” dropdown.

**Testing**  
- After onboarding, redirect here. Show correct progress (zero initially).

---

### `client/src/pages/AdminPage.jsx`

**Purpose**  
Admin portal for PDF upload, ingestion monitoring, sending reports.

**Inputs**  
- Admin secret (maybe simple password in env)

**Outputs**  
- Form for PDF + subject name + class number.  
- Progress bar for ingestion.  
- List of ingested subjects with delete buttons.  
- “Send Progress Report” button.

**How it works**  
1. Uses `api.uploadPDF(formData)` with multipart.  
2. Polls `/api/admin/ingest/status/:jobId` to show chunk count.  
3. On “Send Report”, POST `/api/admin/send-report` with studentId (or all).  
4. Delete sends DELETE `/api/admin/subject/:subjectId`.

**Testing**  
- Upload a small test PDF; verify ingestion starts and chunks appear in DB.

---

### `client/src/hooks/useVoice.js`

**Purpose**  
Custom hook to abstract voice adapter for frontend (talks to backend voice endpoints).

**Inputs**  
- `sessionId`

**Outputs**  
- `{ startListening, stopListening, speakText, isListening, isSpeaking }`

**How it works**  
- Wraps API calls to `/api/session/listen/*` and `/api/session/speak`.  
- Uses `axios` to send audio blobs or commands.  
- For speaking, backend uses Vapi TTS and returns stream URL (or plays via Web Audio).

**Testing**  
- Call `speakText("Hello")` → backend should speak via Vapi.

---

### `client/src/hooks/useSession.js`

**Purpose**  
Manages student session (login, logout, resume point).

**Inputs**  
- None (uses localStorage/sessionStorage)

**Outputs**  
- `{ student, login, logout, resumePoint }`

**How it works**  
- On mount, checks for stored studentId and fetches profile.  
- `login(name)` POST `/api/auth/login` with fuzzy name matching.  
- Stores student object.

**Testing**  
- Login with a name that exists; student data returned.

---

### `client/src/services/api.js`

**Purpose**  
Axios instance with base URL and all API endpoint functions.

**Inputs**  
- Endpoint-specific parameters.

**Outputs**  
- Promise with response data.

**How it works**  
- Defines: `startListening(sessionId)`, `stopListening(sessionId)`, `sendCommand(sessionId, transcript)`, `getChunk(chunkId)`, `getProgress(...)`, `uploadPDF(formData)`, etc.  
- Handles errors and shows toast messages.

**Testing**  
- Mock axios and test each function.

---

### `client/src/App.jsx`

**Purpose**  
Routing and global state provider.

**How it works**  
- Uses React Router: routes `/onboarding`, `/learn/:subjectId/:chapterId?`, `/dashboard`, `/admin`.  
- Wraps with `SessionProvider`.

---

### `client/src/main.jsx`

ReactDOM render entry point.

---

## 🗄️ BACKEND (Node.js + Express)

### `server/adapters/voice.adapter.js` ⭐ (Swappable)

**Purpose**  
Abstracts all Vapi STT/TTS calls. Replace this file to change voice provider.

**Inputs**  
- Environment: `VAPI_API_KEY`, `VAPI_BASE_URL`  
- Functions:  
  - `speakText(text, sessionId, language = 'en')`  
  - `startListening(sessionId, onTranscript, language = 'en')`  
  - `stopListening(sessionId)`

**Outputs**  
- `speakText`: returns `{ audioUrl, success }`  
- `startListening`: returns `{ streamId }` and calls `onTranscript(finalText)` when utterance ends  
- `stopListening`: returns `{ finalTranscript }`

**How it works** (Vapi specific)  
1. `speakText`: POST `{ text, voice: { language, voiceId } }` to Vapi TTS endpoint. Returns audio URL. Backend plays it via res.audio or sends URL to frontend.  
2. `startListening`: creates a real-time STT session via Vapi WebSocket or polling endpoint. Keeps session handle in memory.  
3. `stopListening`: ends session and returns accumulated transcript.

**Testing**  
- Mock Vapi responses. Test that `speakText` calls correct endpoint with API key.  
- Integration: Use Vapi sandbox key, speak into mic, verify transcript.

---

### `server/adapters/vector.adapter.js` ⭐ (Swappable)

**Purpose**  
Abstracts all Qdrant vector database operations.

**Inputs**  
- Environment: `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`  
- Functions:  
  - `upsertChunk(chunkId, vector, metadata)`  
  - `searchChunks(queryVector, topK, filter)`  
  - `deleteChunk(chunkId)`  
  - `ensureCollection(name, vectorSize)`

**Outputs**  
- `upsertChunk`: `{ id, status }`  
- `searchChunks`: `[{ chunkId, score, metadata }]`

**How it works** (Qdrant)  
1. `ensureCollection`: creates collection with cosine similarity, vector size 1536 (for `text-embedding-3-small`).  
2. `upsertChunk`: calls Qdrant `/collections/{name}/points` with point.  
3. `searchChunks`: POST `/search` with vector and filter (e.g., `{ must: [{ key: "subject_id", match: { value } }] }`).  
4. `deleteChunk`: delete point by id.

**Testing**  
- Use Qdrant local Docker. Insert a test vector, search for nearest, verify returned chunkId.

---

### `server/config/db.js`

**Purpose**  
MongoDB connection using Mongoose.

**Inputs**  
- `MONGODB_URI` from env

**Outputs**  
- Exports `connectDB()` function.

**How it works**  
- Uses `mongoose.connect()` with options `{ useNewUrlParser, useUnifiedTopology }`.  
- Logs success or failure.

**Testing**  
- Run with invalid URI → error thrown. Valid URI → connection open.

---

### `server/config/env.js`

**Purpose**  
Loads and validates environment variables.

**Inputs**  
- `.env` file

**Outputs**  
- Exports all variables, throws if required missing.

**How it works**  
- Uses `dotenv` and checks for `GROQ_API_KEY`, `VAPI_API_KEY`, etc.

**Testing**  
- Remove a required key → app crashes early.

---

### `server/models/Student.js`

**Purpose**  
Mongoose schema for student profile.

**Fields**  
```js
{
  name: { type: String, required },
  class_num: { type: Number, required, min:1, max:12 },
  subjects: [{ type: String }], // e.g., ["Science","Maths"]
  language: { type: String, default: 'en', enum: ['en','hi'] },
  created_at: { type: Date, default: Date.now },
  last_active: Date
}
```

**Testing**  
- Create new student; validate required fields.

---

### `server/models/Subject.js`

**Fields**  
```js
{
  name: String,
  class_num: Number,
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }]
}
```

---

### `server/models/Chapter.js`

**Fields**  
```js
{
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  title: String,
  chapter_num: Number,
  chunk_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
  total_chunks: Number
}
```

---

### `server/models/Chunk.js` (Core)

**Fields**  
```js
{
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  chunk_index: Number,
  heading: String,
  raw_text: String,
  word_count: Number,
  teaching_script: String,
  teaching_script_hi: String, // for Hindi support
  quiz: [{
    question: String,
    options: { A: String, B: String, C: String, D: String },
    correct_answer: String, // "A" or "B" etc.
    concept_tested: String
  }],
  image_descriptions: [String],
  qdrant_id: String
}
```

**Testing**  
- Insert a chunk with all fields; retrieve via Mongoose.

---

### `server/models/Progress.js`

**Fields**  
```js
{
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  chapter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' },
  completed_chunks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' }],
  current_chunk_index: Number,
  quiz_results: [{
    chunk_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Chunk' },
    concept: String,
    correct: Boolean,
    timestamp: Date
  }],
  chapter_completed: Boolean,
  last_updated: Date
}
```

---

### `server/models/Conversation.js`

**Fields**  
```js
{
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  session_date: Date,
  messages: [{
    role: { type: String, enum: ['teacher','student'] },
    text: String,
    timestamp: Date
  }],
  subject_context: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  chapter_context: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter' }
}
```

---

### `server/routes/auth.routes.js`

**Endpoints**  
- `POST /api/auth/onboard` – Creates new student.  
  - Body: `{ name, class_num, subjects, language }`  
  - Returns student object.  
- `POST /api/auth/login` – Authenticates by name fuzzy match.  
  - Body: `{ name, class_num? }`  
  - Returns student if found (multiple matches ask to choose class).  
- `GET /api/auth/me/:studentId` – Returns student profile.

**How it works**  
- Onboard: validates, saves to MongoDB.  
- Login: uses regex `new RegExp(name, 'i')` to find matches; if multiple, returns list.

**Testing**  
- Postman: send onboard request, then login with same name.

---

### `server/routes/session.routes.js` (Intent classifier)

**Endpoints**  
- `POST /api/session/command` – Accepts `{ sessionId, transcript }`.  
  - Performs intent classification via regex (no LLM).  
  - Calls appropriate service (teaching, qa, quiz).  
  - Returns `{ action, data }` and triggers TTS.  
- `POST /api/session/listen/start` – Starts Vapi STT for given session.  
- `POST /api/session/listen/stop` – Stops and returns transcript.  
- `GET /api/session/conversation/:sessionId` – Returns messages.

**Intent regex patterns** (in order)  
```js
/start (science|maths|...) chapter (\d+)/i → action: START_CHAPTER, subject, chapterNum
/continue|next/i → CONTINUE
/repeat|say again/i → REPEAT
/what is (.+)/i → QA
/quiz|test me/i → START_QUIZ
/go to dashboard/i → DASHBOARD
```

**How it works**  
- For START_CHAPTER: fetch subjectId from DB by name and class, fetch chapter, call `teaching.service.getFirstChunk`.  
- For QA: call `qa.service.answerQuestion(transcript, sessionId)`.  
- Sends response text to `voice.adapter.speakText()` and saves to Conversation.

**Testing**  
- Send `{ transcript: "start science chapter 3" }` → verify teaching service called.

---

### `server/routes/quiz.routes.js`

**Endpoints**  
- `POST /api/quiz/start` – Begins quiz session for a chapter.  
- `POST /api/quiz/answer` – Accepts `{ sessionId, answerLetter }` and returns correct/incorrect.  
- `GET /api/quiz/next` – Returns next question.

**How it works**  
- Stores quiz state in memory (or Redis). After last question, triggers `quiz.service.evaluateAndReTeach`.

**Testing**  
- Call start, then answer, check scores.

---

### `server/routes/progress.routes.js`

**Endpoints**  
- `GET /api/progress/dashboard/:studentId` – Returns aggregated progress + AI insights (calls `progress.service.getDashboardData`).  
- `PUT /api/progress/update` – Marks a chunk as completed.

---

### `server/routes/admin.routes.js`

**Endpoints**  
- `POST /api/admin/ingest` – Accepts PDF file, subject name, class number. Starts async ingestion job, returns jobId.  
- `GET /api/admin/ingest/status/:jobId` – Returns progress.  
- `DELETE /api/admin/subject/:subjectId` – Deletes subject and all related chunks from MongoDB and Qdrant.  
- `POST /api/admin/send-report` – Triggers email report to `REPORT_EMAIL`.

**How it works**  
- Uses `multer` for file upload.  
- Calls `ingestion.service.processPDF()` in background (setImmediate or Bull queue).

**Testing**  
- Upload a small PDF, monitor status endpoint.

---

### `server/services/teaching.service.js`

**Purpose**  
Fetches pre-generated teaching content from MongoDB.

**Inputs**  
- `studentId`, `subjectId`, `chapterId`, `chunkIndex` (optional)

**Outputs**  
- `{ script: string, rawText: string, chunkId, chunkIndex, totalChunks }`

**How it works**  
1. Get student language from Student model.  
2. Find Chunk by chapter_id and chunk_index.  
3. Select `teaching_script` or `teaching_script_hi` based on language.  
4. Update progress if needed (mark chunk as completed when moving forward).

**Testing**  
- Mock chunk with both scripts. Call for `language=en` → returns English script.

---

### `server/services/qa.service.js` (RAG pipeline)

**Purpose**  
Answers free-form questions using Qdrant retrieval and Groq LLM.

**Inputs**  
- `question` (string)  
- `sessionId` (to get subject/chapter context)  
- `studentId` (for class level)

**Outputs**  
- `{ answer: string, sourceChunks: [chunkId] }`

**How it works**  
1. Get embedding for `question` using Groq embedding API or local model.  
2. Call `vector.adapter.searchChunks(embedding, topK=3, filter={ subject_id, chapter_id })`.  
3. Fetch full raw_text of those chunks from MongoDB.  
4. Build Groq system prompt:  
   ```
   You are an NCERT teacher for class {classNum}.  
   Answer ONLY using the provided textbook excerpts.  
   If the answer is not in the excerpts, say "I don't know, let's focus on what the book says."  
   Keep answer simple and short.
   ```  
5. Call Groq LLM (LLaMA 3.3 70B) with context + question.  
6. Stream response and return answer.  
7. Save Q&A pair to Conversation.

**Testing**  
- Insert a chunk about photosynthesis, ask “What is photosynthesis?” → answer extracted from chunk.

---

### `server/services/quiz.service.js`

**Purpose**  
Handles quiz flow, scoring, and re-teaching.

**Inputs**  
- `chapterId`, `studentId`

**Outputs**  
- Emits quiz questions and final re-teaching instructions.

**How it works**  
1. Fetch all chunks of chapter, collect their `quiz` arrays.  
2. Randomly select 5 questions.  
3. For each, speak question + options via TTS, wait for student voice answer.  
4. Compare answer with `correct_answer`. Record in Progress.quiz_results.  
5. After all, compute per-concept accuracy. For concepts with >1 wrong answer, fetch the corresponding chunk and speak its `teaching_script` again.  
6. Save final results.

**Testing**  
- Simulate quiz with mock answers. Verify wrong concept leads to re-teach.

---

### `server/services/progress.service.js`

**Purpose**  
Aggregates progress and generates AI insights.

**Inputs**  
- `studentId`

**Outputs**  
- `{ subjects: [{ name, chunksCompleted, totalChunks, quizAvg }], weakConcepts: [string], aiInsights: string }`

**How it works**  
1. Aggregate Progress documents aggregated by subject.  
2. For weak concepts: query `quiz_results` where `correct: false` and count >1 per concept.  
3. Build a JSON summary of student progress.  
4. Call Groq with:  
   ```
   Given this student progress data: {JSON}, write 3 short encouraging insights about their learning pattern. Max 2 sentences each.
   ```  
5. Return insights string.

**Testing**  
- Insert sample progress, verify insights string is non-empty and encouraging.

---

### `server/services/ingestion.service.js`

**Purpose**  
Orchestrates the PDF ingestion pipeline.

**Inputs**  
- `pdfBuffer` (Buffer), `subjectName`, `classNum`

**Outputs**  
- Returns `{ success: true, chunksCreated: N, chaptersCreated: M }`

**How it works** (step-by-step)  
1. Parse PDF using `pdf-parse` → get text and page positions.  
2. Extract images using `pdf2pic` (convert each page to PNG). For each image, call Groq LLaMA 4 Scout vision API with prompt: “Describe this diagram or image from a NCERT textbook for blind students.” Store description.  
3. Inject descriptions into text at the approximate location as `[IMAGE: description]`.  
4. Pass enriched text to `chunker.service.js` → returns array of chunks.  
5. For each chunk, call `contentgen.service.js` to generate `teaching_script` and `quiz`.  
6. Save Subject, Chapter, Chunk records to MongoDB.  
7. Generate embedding for `raw_text` of each chunk (using Groq `text-embedding-3-small` or local sentence-transformers).  
8. Call `vector.adapter.upsertChunk(chunkId, embedding, metadata { subject_id, chapter_id })`.  
9. Update Subject.chapters and Chapter.chunk_ids references.

**Testing**  
- Provide a small 2-page NCERT PDF. Verify chunks appear in MongoDB, vectors in Qdrant.

---

### `server/services/chunker.service.js`

**Purpose**  
Splits enriched text into structural chunks.

**Inputs**  
- `enrichedText` (string with `[IMAGE: ...]` tags)  
- `headingDetectionEnabled` (bool)

**Outputs**  
- Array of `{ chunk_index, heading, raw_text, word_count }`

**How it works**  
1. Split text by newlines.  
2. Detect headings using regex `^\d+\.\s+[A-Z]` (e.g., "2.1 Photosynthesis").  
3. Also detect bold lines if markdown/HTML.  
4. Group paragraphs until next heading or max 600 words.  
5. If chunk <150 words, merge with next.  
6. Image tags remain inside the chunk they belong to.

**Testing**  
- Input sample NCERT text. Output chunks should not break image descriptions mid-sentence.

---

### `server/services/contentgen.service.js`

**Purpose**  
Pre-generates teaching script and quiz using Groq.

**Inputs**  
- `chunkRawText`, `classNum`, `subject`, `language` (default 'en')

**Outputs**  
- `{ teaching_script, teaching_script_hi, quiz: [...] }`

**How it works**  
1. Teaching script generation (English):  
   Prompt:  
   ```
   You are an NCERT teacher for class {classNum}. Teach the following content to a blind student using only speech. Be warm, clear, use simple analogies. When you see [IMAGE: description], say exactly: "In the book, there is a diagram that shows ..." Keep teaching to 3-4 short paragraphs.
   Content: {chunkRawText}
   ```  
   Call Groq, store result.  
2. Teaching script generation (Hindi) – only if language 'hi' is requested, similar prompt in Hindi.  
3. Quiz generation:  
   Prompt:  
   ```
   Generate exactly 3 multiple choice questions from this NCERT content for class {classNum} students. Each question must have 4 options (A, B, C, D) and one correct answer. Return JSON array: [{question, options: {A,B,C,D}, correct_answer, concept_tested}].  
   Content: {chunkRawText}
   ```  
   Parse JSON, validate.

**Testing**  
- Call with a chunk about photosynthesis. Verify returned teaching_script is coherent and quiz has valid JSON.

---

### `server/services/mail.service.js`

**Purpose**  
Sends progress report via Nodemailer.

**Inputs**  
- `studentId` (or `null` for all students)  
- `recipientEmail` (from env `REPORT_EMAIL`)

**Outputs**  
- `{ success: true }` or throws error

**How it works**  
1. Fetch student(s) progress data.  
2. Generate HTML table of subjects, completion %, quiz scores.  
3. Use Gmail SMTP with `GMAIL_USER` and `GMAIL_APP_PASSWORD`.  
4. Send email.

**Testing**  
- Use test Gmail account; verify email arrives.

---

### `server/middleware/auth.middleware.js`

**Purpose**  
Protects routes with JWT (not used initially but scaffolded). For hackathon, it can be a simple API key for admin routes.

**Inputs**  
- `req.headers.authorization`

**Outputs**  
- Calls `next()` if valid, else 401.

---

### `server/middleware/error.middleware.js`

**Purpose**  
Central error handler.

**How it works**  
- Logs error, sends `{ error: message }` with appropriate status.

---

### `server/index.js`

**Purpose**  
Express app entry point.

**How it works**  
- Loads env, connects to MongoDB.  
- Sets up middleware (express.json, cors).  
- Mounts routes.  
- Starts server on PORT.

---

### `scripts/ingest.js`

**Purpose**  
CLI for bulk ingestion.

**Inputs**  
- Command line args: `--pdf <path> --subject <name> --class <num>`

**How it works**  
- Reads PDF file, calls `ingestion.service.processPDF` programmatically.  
- Prints progress to console.

**Testing**  
- Run `node scripts/ingest.js --pdf ./test.pdf --subject Science --class 6` → verify DB and Qdrant populated.

---

### `docs/Linguistic-Expansion-Route.md`

Already provided in user prompt – copy as is.

---

### `.env.example`

```
GROQ_API_KEY=your_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
VAPI_API_KEY=your_vapi_key
VAPI_BASE_URL=https://api.vapi.ai
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_key
QDRANT_COLLECTION=drishti_vani_chunks
MONGODB_URI=mongodb+srv://...
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
REPORT_EMAIL=gauravmishraokok@gmail.com
PORT=5000
JWT_SECRET=your_secret
```

---

# 🧪 HOW TO TEST THE ENTIRE APPLICATION

## Prerequisites
- Node.js 18+, MongoDB Atlas free tier, Qdrant Cloud or Docker, Groq API key, Vapi API key.

## Step 1: Backend Setup
1. Clone the directory structure above.  
2. Run `npm install` in `/server`.  
3. Create `.env` from `.env.example`.  
4. Start MongoDB, Qdrant.  
5. Run `node server/index.js` (should listen on port 5000).

## Step 2: Frontend Setup
1. `cd client`, `npm install`.  
2. `npm run dev` (Vite on port 5173).

## Step 3: Ingestion Test
- Open Admin page (http://localhost:5173/admin).  
- Upload a sample NCERT PDF (e.g., Class 6 Science Chapter 1).  
- Observe backend logs: chunking, vision API calls, Qdrant upserts.  
- Verify in MongoDB that `chunks` collection has documents with `teaching_script` and `quiz`.  
- Verify in Qdrant dashboard that points exist.

## Step 4: Teaching Flow Test
- Open http://localhost:5173.  
- Say “new student” → complete onboarding (name “Test”, class 6, subject “Science”).  
- After dashboard, say “start science chapter 1”.  
- Verify that first chunk’s teaching script is spoken instantly (no LLM delay).  
- Say “continue” three times. Verify progress bar advances.  
- After last chunk, quiz should start automatically.

## Step 5: Q&A Test
- Mid-lesson, hold spacebar and say “what is chlorophyll?”  
- Expect RAG answer (within 2-3 seconds, includes Groq call).  
- Check ConversationPanel for the Q&A pair.

## Step 6: Quiz & Re-teach Test
- When quiz starts, deliberately answer some wrong.  
- After quiz, system should say “Let me explain those again” and re-teach the concepts you missed.  
- Check `Progress.quiz_results` for incorrect entries.

## Step 7: Dashboard & Insights
- Navigate to dashboard.  
- Verify weak concepts appear.  
- AI insights should show encouraging sentences.

## Step 8: Admin Report
- Click “Send Progress Report”.  
- Check that email arrives at gauravmishraokok@gmail.com (or your test email).

## Step 9: Adapter Swap Test (Proof of concept)
- Replace `voice.adapter.js` with a mock that logs instead of calling real Vapi.  
- Run app again; everything should work (but no audio). This proves isolation.

---

# ✅ Final Notes for the “Dumb Agent”

All specifications above are **complete, self-contained, and executable** by a developer who can read and write code. Each file’s purpose, inputs, outputs, algorithm, and test are explicitly stated. The agent can implement each module independently following these specs. After implementation, run the test plan to validate.

**No more ambiguity.** Build exactly as specified.
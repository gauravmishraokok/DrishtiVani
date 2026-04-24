import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Mic, Volume2, BookOpen, MessageSquare } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import TextbookPanel from '../components/TextbookPanel';
import ConversationPanel from '../components/ConversationPanel';
import VoiceButton from '../components/VoiceButton';
import QuizOverlay from '../components/QuizOverlay';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';

const LearningPage = () => {
  const { subjectId, chapterId } = useParams();
  const studentId = localStorage.getItem('studentId');
  
  const [currentChunk, setCurrentChunk] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { startListening, stopListening, speakText, isCallActive, isListening, isSpeaking, voiceMode, setVoiceMode, transcript, diagnostics } = useVoice(studentId);
  const [quizState, setQuizState] = useState({ isOpen: false, question: null, currentIndex: 0, total: 0, score: 0 });

  const buildQuizPrompt = useCallback((question, currentIndex, total) => {
    if (!question) return '';
    const opts = question.options || {};
    return `Question ${currentIndex + 1}${total ? ` of ${total}` : ''}. ${question.question}. Option A: ${opts.A || 'Not provided'}. Option B: ${opts.B || 'Not provided'}. Option C: ${opts.C || 'Not provided'}. Option D: ${opts.D || 'Not provided'}.`;
  }, []);

  const speakQuizQuestion = useCallback((question, currentIndex, total) => {
    const prompt = buildQuizPrompt(question, currentIndex, total);
    if (prompt) {
      speakText(prompt, 'VT');
    }
  }, [buildQuizPrompt, speakText]);

  const extractOptionFromTranscript = useCallback((text) => {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();
    const explicit = normalized.match(/option\s*([a-d])\b/i);
    if (explicit) return explicit[1].toUpperCase();

    const short = normalized.match(/\b([a-d])\b/i);
    if (short) return short[1].toUpperCase();

    return null;
  }, []);

  const submitQuizAnswer = useCallback(async (opt) => {
    try {
      const answerRes = await api.submitAnswer(studentId, opt);
      const data = answerRes.data;
      const feedback = data.correct ? 'Correct answer. Great job.' : 'That is incorrect. Keep trying.';
      speakText(feedback, 'VT');
      setMessages((prev) => [...prev, { role: 'teacher', text: feedback }]);

      if (data.nextQuestion) {
        const nextQuizState = {
          isOpen: true,
          question: data.nextQuestion,
          currentIndex: data.currentIndex || quizState.currentIndex + 1,
          total: data.total || quizState.total,
          score: data.score ?? quizState.score
        };
        setQuizState(nextQuizState);
        setTimeout(() => speakQuizQuestion(nextQuizState.question, nextQuizState.currentIndex, nextQuizState.total), 500);
        return;
      }

      setQuizState({ isOpen: false, question: null, currentIndex: 0, total: 0, score: 0 });
      if (data.finished) {
        const quizWrapUp = `Quiz complete. Your score is ${data.score}. ${data.remedialText || ''}`.trim();
        setMessages((prev) => [...prev, { role: 'teacher', text: quizWrapUp }]);
        speakText(quizWrapUp, 'VT');
      }
    } catch (err) {
      setQuizState({ isOpen: false, question: null, currentIndex: 0, total: 0, score: 0 });
      setMessages((prev) => [...prev, { role: 'teacher', text: 'Quiz submission failed. Let us continue learning.' }]);
    }
  }, [studentId, speakText, quizState.currentIndex, quizState.total, quizState.score, speakQuizQuestion]);

  // Handle Command Loop
  const handleCommand = useCallback(async (text) => {
    if (!text) return;
    
    // Add student transcript to UI immediately
    setMessages(prev => [...prev, { role: 'student', text: text }]);

    try {
      setIsLoading(true);
      const res = await api.sendCommand(studentId, text);
      const payload = res.data;
      if (payload.voiceMode) {
        await setVoiceMode(payload.voiceMode);
      }

      // Update Textbook View
      if (payload.action === 'START_CHAPTER' || payload.action === 'CONTINUE') {
        setCurrentChunk({
          raw_text: payload.rawText || "Neural buffer loading...",
          chunk_index: (payload.chunkIndex ?? 0) + 1,
          total_chunks: payload.totalChunks || 10
        });
      }

      // Handle Quizzes
      if (payload.action === 'START_QUIZ') {
        const quizRes = await api.startQuiz(studentId, payload.chapterId);
        const nextQuizState = {
          isOpen: true,
          question: quizRes.data.question,
          currentIndex: quizRes.data.currentIndex || 0,
          total: quizRes.data.total || 0,
          score: 0
        };
        setQuizState(nextQuizState);
        setTimeout(() => speakQuizQuestion(nextQuizState.question, nextQuizState.currentIndex, nextQuizState.total), 300);
      }

      // SYNC: Push the Teacher's explanation to the UI and Voice simultaneously
      // This ensures what you HEAR is what you SEE
      setMessages(prev => [...prev, { role: 'teacher', text: payload.text }]);
      if (payload.useClientTTS !== false) {
        speakText(payload.text, payload.voiceMode);
      }
      
    } catch (err) {
      console.error('[UI] Command error:', err);
      setMessages(prev => [...prev, { role: 'teacher', text: "Uplink disrupted. Systems recalibrating..." }]);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, speakText, setVoiceMode, speakQuizQuestion]);

  useEffect(() => {
    if (!quizState.isOpen) return;
    setVoiceMode('VT');
  }, [quizState.isOpen, setVoiceMode]);

  // Global Keyboard listener for Spacebar
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        if (!isListening) {
          startListening();
          return;
        }
        const finalText = await stopListening();
        if (!finalText) return;

        if (quizState.isOpen) {
          const pickedOption = extractOptionFromTranscript(finalText);
          if (!pickedOption) {
            speakText('Please answer with option A, B, C, or D.', 'VT');
            setMessages((prev) => [...prev, { role: 'teacher', text: 'Please answer with option A, B, C, or D.' }]);
            return;
          }
          setMessages((prev) => [...prev, { role: 'student', text: `Option ${pickedOption}` }]);
          await submitQuizAnswer(pickedOption);
          return;
        }

        handleCommand(finalText);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startListening, stopListening, handleCommand, isListening, quizState.isOpen, extractOptionFromTranscript, speakText, submitQuizAnswer]);

  const initializedRef = useRef(false);

  useEffect(() => {
    // Explicit Database-Driven Chapter Start
    const loadChapter = async () => {
       if (studentId && chapterId && !initializedRef.current) {
          initializedRef.current = true;
          try {
             setIsLoading(true);
             const res = await api.startChapter(studentId, chapterId, subjectId);
             const payload = res.data;
             if (payload.voiceMode) {
               await setVoiceMode(payload.voiceMode);
             }
             setCurrentChunk({
                raw_text: payload.rawText,
                chunk_index: payload.chunkIndex + 1,
                total_chunks: payload.totalChunks
             });
             setMessages([{ role: 'teacher', text: payload.text }]);
             if (payload.useClientTTS !== false) {
               speakText(payload.text, payload.voiceMode);
             }
          } catch (err) {
             console.error('[UI] Chapter load error:', err);
             setMessages([{ role: 'teacher', text: "Failed to initialize curriculum vectors." }]);
          } finally {
             setIsLoading(false);
          }
       }
    };
    
    loadChapter();
  }, [studentId, chapterId, speakText, setVoiceMode]);

  return (
    <div className="min-h-screen bg-background text-foreground-bright p-6 lg:p-10 pb-40 overflow-hidden flex flex-col">
      {/* Header Status Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-accent/20 rounded-2xl text-accent"><BookOpen size={24}/></div>
           <div>
              <h1 className="text-xl font-bold tracking-tight">Active Neural Learning Session</h1>
              <p className="text-xs mono text-foreground-muted uppercase">Student_Link: {studentId?.slice(-6).toUpperCase()}</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full border mono text-[10px] flex items-center gap-2 transition-all ${isCallActive ? 'bg-success/10 border-success/30 text-success' : 'bg-surface border-border text-foreground-muted'}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${isCallActive ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
            {voiceMode === 'AGENT' ? 'AGENT_MODE' : 'VT_MODE'}
          </div>
          <Activity size={18} className="text-foreground-muted animate-pulse" />
        </div>
      </div>

      <ProgressBar 
        current={currentChunk?.chunk_index || 0} 
        total={currentChunk?.total_chunks || 10} 
        chapterTitle={currentChunk ? "NCERT Content Stream Active" : "Initializing Subject Context..."} 
      />
      
      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-8 mt-8 flex-1 min-h-0">
        {/* Left Aspect: Textbook (The "Reference") */}
        <div className="lg:w-3/5 flex flex-col min-h-0">
          <TextbookPanel text={currentChunk?.raw_text} isLoading={isLoading} />
        </div>

        {/* Right Aspect: Conversation (The "Teaching") */}
        <div className="lg:w-2/5 flex flex-col min-h-0">
          <ConversationPanel messages={messages} />
        </div>
      </div>

      {/* Futuristic Floating Control Hub */}
      {!quizState.isOpen && <div className="fixed bottom-12 left-1/2 -translate-x-1/2">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-10 bg-surface px-12 py-8 rounded-[40px] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <div className="flex flex-col items-end gap-1">
             <span className="mono text-[9px] text-foreground-muted uppercase">Mic_Input</span>
             <div className="flex gap-1 h-3 items-center">
                {[1,2,3,4].map(i => <div key={i} className={`w-1 rounded-full transition-all ${isListening ? 'bg-accent animate-bounce' : 'bg-border'}`} style={{ height: isListening ? `${Math.random()*100+20}%` : '40%' }} />)}
             </div>
          </div>

          <VoiceButton 
            isListening={isListening} 
            onClick={() => isListening ? stopListening() : startListening()} 
            status={isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle'}
          />

          <div className="flex flex-col items-start gap-1">
             <span className="mono text-[9px] text-accent uppercase">AI_Voice_Out</span>
             <div className="flex items-center gap-2">
                <Volume2 size={16} className={isSpeaking ? 'text-success animate-bounce' : 'text-foreground-muted'} />
                {isSpeaking && <Activity size={12} className="text-success animate-pulse"/>}
             </div>
          </div>
        </motion.div>
        <p className="text-center mt-4 mono text-[10px] text-foreground-muted uppercase tracking-widest">Press Space to Start/Stop Voice Input</p>
      </div>}

      {!quizState.isOpen && <div className="fixed top-24 right-4 z-50 bg-black/80 text-white text-xs rounded-lg border border-white/20 p-3 space-y-1 w-72">
        <div className="font-bold">Voice Debug</div>
        <div>mode: {voiceMode}</div>
        <div>engine: {diagnostics.activeEngine}</div>
        <div>sttSupported: {String(diagnostics.sttSupported)}</div>
        <div>ttsSupported: {String(diagnostics.ttsSupported)}</div>
        <div>isListening(state): {String(isListening)}</div>
        <div>isListening(internal): {String(diagnostics.listeningInternal)}</div>
        <div>isCallActive: {String(isCallActive)}</div>
        <div>lastTranscript: {transcript || '-'}</div>
        <div>lastError: {diagnostics.lastError || '-'}</div>
      </div>}

      <QuizOverlay 
        isOpen={quizState.isOpen} 
        question={quizState.question}
        currentIndex={quizState.currentIndex}
        total={quizState.total}
        score={quizState.score}
        onAnswer={submitQuizAnswer}
      />
    </div>
  );
};

export default LearningPage;

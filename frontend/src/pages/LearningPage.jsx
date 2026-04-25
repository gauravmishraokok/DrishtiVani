import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Volume2, BookOpen, MessageSquare, ShieldCheck, ChevronLeft, Mic } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TextbookPanel from '../components/TextbookPanel';
import ConversationPanel from '../components/ConversationPanel';
import VoiceButton from '../components/VoiceButton';
import QuizOverlay from '../components/QuizOverlay';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';

const LearningPage = () => {
    const { subjectId, chapterId } = useParams();
    const studentId = localStorage.getItem('studentId');
    const navigate = useNavigate();

    const [currentChunk, setCurrentChunk] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { startListening, stopListening, speakText, isCallActive, isListening, isSpeaking, voiceMode, setVoiceMode, diagnostics } = useVoice(studentId);
    const [quizState, setQuizState] = useState({ isOpen: false, questions: [], currentIdx: 0, answers: [], type: 'mid' });

    // Hands-free State
    const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
    const initializedRef = useRef(false);

    const transitionPrompts = [
        "Should we move to the next part?", "Shall I continue?", "Ready for more?", "Did you get that? Should we proceed?",
        "Got it? Let's move on.", "Check! Ready for the next section?", "Shall we keep going?", "Does that make sense? Want to continue?",
        "Understandable? Let's proceed.", "Okay, ready for the next one?", "Want me to go ahead?", "Should we see what is next?",
        "How was that? Ready to move forward?", "Ready for the next concept?", "Shall we advance?", "Want to hear more?",
        "Done with this part? Let's continue.", "Okay, next section?", "Ready? Let's go ahead."
    ];

    const continueIntents = [
        "yes", "next", "got it", "sure", "definitely", "okay", "ok", "yep", "yeah", "proceed",
        "continue", "move on", "keep going", "that's it", "understood", "all right", "alright", "go ahead"
    ];

    const getRandomTransition = () => transitionPrompts[Math.floor(Math.random() * transitionPrompts.length)];

    const startChapter = async () => {
        if (studentId && chapterId && !initializedRef.current) {
            initializedRef.current = true;
            try {
                setIsLoading(true);
                const res = await api.startChapter(studentId, chapterId, subjectId);
                const payload = res.data;
                setCurrentChunk({
                    raw_text: payload.rawText, chunk_index: (payload.chunkIndex || 0) + 1, total_chunks: payload.totalChunks,
                    pageNum: payload.pageNum, pageImagePath: payload.pageImagePath, chapterTitle: payload.chapterTitle,
                    chapterId: payload.chapterId || chapterId
                });
                const hasQuestion = /[?|!]\s*$/.test(payload.text);
                const combinedText = hasQuestion ? payload.text : `${payload.text} ... ${getRandomTransition()}`;
                setMessages([{ role: 'teacher', text: combinedText }]);
                speakText(combinedText, 'VT');
                setIsAwaitingConfirmation(true);
            } catch (err) {
                setMessages([{ role: 'teacher', text: "Failed to load the study material. Please try again." }]);
            } finally { setIsLoading(false); }
        }
    };

    useEffect(() => { startChapter(); }, [studentId, chapterId]);

    const handleQuizComplete = async (answers) => {
        try {
            await api.submitQuizResult({
                studentId,
                chapterId: currentChunk?.chapterId || chapterId,
                type: quizState.type,
                results: answers
            });
            setQuizState({ ...quizState, isOpen: false });
        } catch (err) {
            console.error('Quiz save fail', err);
            setQuizState({ ...quizState, isOpen: false });
        }
    };

    const handleManualAction = async (transcript) => {
        if (!transcript) return;
        const lower = transcript.toLowerCase();

        // 1. QUIZ OPTION MAPPING
        if (quizState.isOpen) {
            const match = lower.match(/(?:option|select|choose|pick)?\s*([a-d])\b/i) || lower.match(/\b([a-d])\b/i);
            if (match) {
                const option = match[1].toUpperCase();
                window.dispatchEvent(new CustomEvent('QUIZ_VOICE_ANSWER', { detail: option }));
                return;
            }
        }

        // 2. VOICE NAVIGATION
        if (/\bgo\s*back\b/.test(lower)) {
            if (quizState.isOpen) {
                setQuizState({ ...quizState, isOpen: false });
                speakText('Going back to the lesson.', 'VT');
                return;
            }
            navigate('/dashboard');
            return;
        }
        if (/\bgo\s*to\s*(dashboard|home)\b/.test(lower)) {
            navigate('/dashboard');
            return;
        }
        if (/\bgo\s*to\s*admin\b/.test(lower)) {
            navigate('/admin');
            return;
        }

        setMessages(prev => [...prev, { role: 'student', text: transcript }]);
        const isContinue = continueIntents.some(intent => lower.includes(intent));
        const isQuizTrigger = /quiz|test|exam|assessment/.test(lower);

        if (isQuizTrigger || (isAwaitingConfirmation && lower.includes('quiz'))) {
            try {
                setIsLoading(true);
                const cid = chapterId;
                const chapterResponse = await api.getChapter(cid);
                if (chapterResponse.data) {
                    setQuizState({
                        isOpen: true,
                        type: lower.includes('final') ? 'final' : 'mid',
                        questions: lower.includes('final') ? chapterResponse.data.final_quiz : chapterResponse.data.mid_quiz,
                        currentIdx: 0,
                        answers: []
                    });
                    return;
                }
            } catch (e) {
                setMessages(prev => [...prev, { role: 'teacher', text: "I'm having trouble starting the quiz. Let's continue the lesson instead." }]);
                return;
            } finally { setIsLoading(false); }
        }

        if (isAwaitingConfirmation && isContinue) {
            try {
                setIsLoading(true);
                const res = await api.sendCommand(studentId, 'continue');
                const payload = res.data;

                if (payload.triggerMidQuiz || payload.triggerFinalQuiz) {
                    const chapterResponse = await api.getChapter(payload.chapterId || chapterId);
                    setQuizState({
                        isOpen: true,
                        type: payload.triggerFinalQuiz ? 'final' : 'mid',
                        questions: payload.triggerFinalQuiz ? chapterResponse.data.final_quiz : chapterResponse.data.mid_quiz,
                        currentIdx: 0,
                        answers: []
                    });
                    return;
                }

                if (payload.action === 'CONTINUE') {
                    setCurrentChunk(prev => ({
                        ...prev,
                        chunk_index: (payload.chunkIndex || 0) + 1,
                        pageNum: payload.pageNum,
                        pageImagePath: payload.pageImagePath,
                        chapterId: payload.chapterId || prev.chapterId || chapterId
                    }));
                    const hasQuestion = /[?|!]\s*$/.test(payload.text);
                    const combined = hasQuestion ? payload.text : `${payload.text} ... ${getRandomTransition()}`;
                    setMessages(prev => [...prev, { role: 'teacher', text: combined }]);
                    speakText(combined, 'VT');
                    setIsAwaitingConfirmation(true);
                    return;
                }
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        }

        if (/continue learning|lesson|done/.test(lower)) {
            setVoiceMode('VT');
            const nextPrompt = `Great. ${getRandomTransition()}`;
            setMessages(prev => [...prev, { role: 'teacher', text: nextPrompt }]);
            speakText(nextPrompt, 'VT');
            setIsAwaitingConfirmation(true);
            return;
        }

        setVoiceMode('AGENT');
        const res = await api.sendCommand(studentId, transcript);
        const payload = res.data;
        setMessages(prev => [...prev, { role: 'teacher', text: payload.text }]);
        speakText(payload.text, 'AGENT');
    };

    useEffect(() => {
        const handleUp = async (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                const text = await stopListening();
                if (text) handleManualAction(text);
            }
        };
        const handleDown = (e) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                startListening();
            }
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
    }, [startListening, stopListening, isAwaitingConfirmation, quizState.isOpen]);

    const percentage = currentChunk?.total_chunks ? Math.round(((currentChunk?.chunk_index - 1) / currentChunk?.total_chunks) * 100) : 0;

    return (
        <div className="h-screen max-h-screen overflow-hidden bg-[#FFF8F3] text-[#1A1A1A] flex font-inter text-sm">

            {/* MAIN VIEWPORT */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#FFF8F3]/20 relative">

                {/* SLIM BREADCRUMB HEADER */}
                <div className="h-10 border-b border-[#E8D5C4]/50 flex items-center justify-between px-4 bg-white/50 shrink-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                        <BookOpen size={12} />
                        <span>{subjectId || 'Subject'}</span>
                        <span className="opacity-30">/</span>
                        <span className="text-[#F97316]">{currentChunk?.chapterTitle || 'Chapter'}</span>
                        {currentChunk?.pageNum && (
                            <>
                                <span className="opacity-30">/</span>
                                <span>Page {currentChunk.pageNum}</span>
                            </>
                        )}
                        {currentChunk?.chunk_index && currentChunk?.total_chunks && (
                            <>
                                <span className="opacity-30">/</span>
                                <span>Section {currentChunk.chunk_index} of {currentChunk.total_chunks}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-bold whitespace-nowrap ${isListening ? 'bg-[#FEE2E2] border-[#EF4444]/30 text-[#EF4444]' : isSpeaking ? 'bg-[#DCFCE7] border-[#16A34A]/30 text-[#16A34A]' : 'bg-[#FFF1E6] border-[#F97316]/20 text-[#F97316]'
                            }`}>
                            {isListening ? (
                                <Mic size={10} />
                            ) : (
                                <Volume2 size={10} />
                            )}
                            {isListening ? 'User Input' : voiceMode === 'AGENT' ? 'Vapi Assistant' : 'Default Assistant'}
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-[#E8D5C4] bg-white">
                            <span className="text-[9px] font-bold text-[#16A34A]">{percentage}%</span>
                        </div>
                    </div>
                </div>

                {/* WORKSPACE */}
                <div className="flex-1 flex flex-col lg:flex-row gap-2 p-2 overflow-hidden min-h-0">
                    <div className="lg:w-[62%] flex flex-col min-h-0 overflow-hidden">
                        <TextbookPanel
                            pageNum={currentChunk?.pageNum}
                            isLoading={isLoading}
                            chapterTitle={currentChunk?.chapterTitle}
                            subjectName={subjectId}
                            pageImagePath={currentChunk?.pageImagePath}
                        />
                    </div>

                    <div className="lg:w-[38%] flex flex-col min-h-0 overflow-hidden">
                        <ConversationPanel messages={messages} />
                    </div>
                </div>


            </div>

            {quizState.isOpen && (
                <QuizOverlay
                    questions={quizState.questions}
                    type={quizState.type}
                    onComplete={handleQuizComplete}
                    speakText={speakText}
                    isListening={isListening}
                />
            )}
        </div>
    );
};

export default LearningPage;

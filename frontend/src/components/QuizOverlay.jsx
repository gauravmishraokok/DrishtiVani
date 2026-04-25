import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Volume2, ArrowRight, Award } from 'lucide-react';

const QuizOverlay = ({ questions, type, onComplete, speakText, isListening }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const hasAnnouncedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const speakTextRef = useRef(speakText);

  // Keep refs current
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { speakTextRef.current = speakText; }, [speakText]);

  const currentQ = questions[currentIdx];

  useEffect(() => {
    const handleVoiceAnswer = (e) => {
      const option = e.detail;
      handleSelect(option);
    };
    window.addEventListener('QUIZ_VOICE_ANSWER', handleVoiceAnswer);
    return () => window.removeEventListener('QUIZ_VOICE_ANSWER', handleVoiceAnswer);
  }, [currentIdx, showResult]);

  useEffect(() => {
    if (!currentQ) return;
    const script = `Question ${currentIdx + 1}: ${currentQ.question}. Option A: ${currentQ.options.A}. Option B: ${currentQ.options.B}. Option C: ${currentQ.options.C}. Option D: ${currentQ.options.D}.`;
    speakTextRef.current(script);
  }, [currentIdx, currentQ]);

  const handleSelect = (option) => {
    if (showResult) return;
    const isCorrect = option === currentQ.correct_answer;
    setShowResult(isCorrect ? 'correct' : 'wrong');

    const newAnswer = {
      question: currentQ.question,
      selected_answer: option,
      correct_answer: currentQ.correct_answer,
      concept_tested: currentQ.concept_tested,
      correct: isCorrect
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    speakTextRef.current(isCorrect ? "That's correct!" : `Actually, the correct answer was option ${currentQ.correct_answer}.`);

    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setShowResult(null);
      } else {
        setIsFinished(true);
      }
    }, 3000);
  };

  // ANNOUNCE RESULT & AUTO-RETURN (runs once via ref guard)
  useEffect(() => {
    if (!isFinished || hasAnnouncedRef.current) return;
    hasAnnouncedRef.current = true;

    const score = answers.filter(a => a.correct).length;
    const msg = `Quiz complete! You scored ${score} out of ${questions.length}. ${score === questions.length ? 'Perfect score!' : score >= questions.length / 2 ? 'Well done!' : 'Keep practicing!'}`;
    speakTextRef.current(msg);

    const timer = setTimeout(() => {
      onCompleteRef.current(answers);
    }, 7000);
    return () => clearTimeout(timer);
  }, [isFinished]);

  if (isFinished) {
    const score = answers.filter(a => a.correct).length;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-10 text-center">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Award size={100} className="text-[#F97316] mb-8" />
        </motion.div>
        <h2 className="text-4xl font-bold text-[#1A1A1A] mb-4">{type === 'mid' ? 'Checkpoint Reached!' : 'Chapter Mastered!'}</h2>
        <p className="text-2xl text-[#6B7280] mb-4 font-medium">Your Score: <span className="text-[#F97316] font-bold">{score} / {questions.length}</span></p>
        <p className="text-[#9CA3AF] animate-pulse">Automatically returning to lesson in a few seconds...</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-white flex flex-col p-10 lg:p-20 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        <div className="flex justify-between items-center mb-12">
          <div className="px-4 py-2 bg-[#FFF1E6] rounded-full text-[#F97316] font-bold text-xs uppercase tracking-widest">
            {type === 'mid' ? 'Mid-Lesson Quiz' : 'Final Assessment'}
          </div>
          <div className="text-[#9CA3AF] font-bold text-sm">Question {currentIdx + 1} of {questions.length}</div>
        </div>

        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-12 leading-tight">{currentQ.question}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {['A', 'B', 'C', 'D'].map((label) => (
            <button
              key={label}
              onClick={() => handleSelect(label)}
              className={`p-8 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${showResult
                ? label === currentQ.correct_answer
                  ? 'border-[#16A34A] bg-[#DCFCE7]/50'
                  : answers[currentIdx]?.selected_answer === label
                    ? 'border-red-500 bg-red-50'
                    : 'border-[#E8D5C4] opacity-50'
                : 'border-[#E8D5C4] hover:border-[#F97316] hover:bg-[#FFF1E6]/30'
                }`}
            >
              <div className="flex items-center gap-6">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-xl ${showResult && label === currentQ.correct_answer ? 'bg-[#16A34A] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
                  }`}>
                  {label}
                </div>
                <div className="text-xl font-medium text-[#1A1A1A]">{currentQ.options[label]}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 p-6 bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Volume2 className={isListening ? 'text-[#F97316] animate-pulse' : 'text-white/40'} />
            <span className="text-xs font-bold uppercase tracking-widest">Say "Option A", "Option B", etc. to answer</span>
          </div>
          {isListening && <div className="text-[10px] bg-[#F97316] px-3 py-1 rounded-full font-bold">LISTENING</div>}
        </div>
      </div>
    </motion.div>
  );
};

export default QuizOverlay;

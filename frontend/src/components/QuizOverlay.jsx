import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

const QuizOverlay = ({ isOpen, question, onAnswer, currentIndex = 0, total = 0, score = 0 }) => {
  if (!isOpen || !question) return null;

  const options = ['A', 'B', 'C', 'D'];
  const safeOptions = question.options || {};

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="mx-auto w-[min(92vw,860px)] rounded-2xl border border-white/15 bg-slate-950 p-8 md:p-10 text-white shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-400 to-cyan-400" />
        
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="text-yellow-300" size={28} />
          <h2 className="text-2xl font-bold text-white">Quick Quiz</h2>
        </div>
        <div className="mb-4 text-sm text-slate-300">
          Question {Math.max(1, currentIndex + 1)}{total ? ` of ${total}` : ''}  |  Score: {score}
        </div>

        <p className="text-lg md:text-xl mb-8 leading-relaxed text-slate-100">{question.question}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/60 transition-all text-left group"
            >
              <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-cyan-200 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                {opt}
              </span>
              <span className="flex-1 text-slate-100">{safeOptions[opt] || `Option ${opt}`}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-5 border-t border-slate-700 flex justify-between items-center text-sm text-slate-300">
          <span>You can say "Option A" or click your answer.</span>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default QuizOverlay;

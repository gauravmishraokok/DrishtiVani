import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MessageCircle, Info } from 'lucide-react';

const ConversationPanel = ({ messages }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="bg-white flex flex-col h-full overflow-hidden border border-[#E8D5C4] rounded-2xl shadow-sm min-h-0">
            <div className="p-4 border-b border-[#E8D5C4] bg-white flex items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
                    <span className="font-bold text-sm text-[#1A1A1A]">AI Tutor</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FFF8F3]/30">
                <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col ${m.role === 'teacher' ? 'items-start' : 'items-end'}`}
                        >
                            <div className={`flex items-center gap-2 mb-1 px-2 text-[10px] font-bold uppercase tracking-wider ${m.role === 'teacher' ? 'text-[#6B7280]' : 'text-[#F97316]'}`}>
                                {m.role === 'teacher' ? 'Tutor' : 'You'}
                            </div>
                            <div
                                className={`max-w-[85%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm border ${m.role === 'teacher'
                                    ? 'bg-white border-[#E8D5C4] text-[#1A1A1A] rounded-tl-none'
                                    : 'bg-[#FFF1E6] border-[#FED7AA] text-[#1A1A1A] rounded-tr-none'
                                    }`}
                            >
                                {m.text}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={scrollRef} />
            </div>

            <div className="p-4 border-t border-[#E8D5C4] bg-white">
                <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                    <Info size={14} />
                    <span>Press Space to speak or click the microphone</span>
                </div>
            </div>
        </div>
    );
};

export default ConversationPanel;

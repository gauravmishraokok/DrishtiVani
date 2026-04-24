import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, User, Cpu } from 'lucide-react';

const ConversationPanel = ({ messages }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 glass-panel flex flex-col h-full overflow-hidden border-accent/20">
      <div className="p-4 border-b border-border bg-surface/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-success" />
          <span className="mono text-xs font-bold tracking-tighter uppercase">Teaching_Script_V11</span>
        </div>
        <div className="flex gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <div className="h-1.5 w-1.5 rounded-full bg-success/40" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: m.role === 'teacher' ? -10 : 10, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              className={`flex flex-col ${m.role === 'teacher' ? 'items-start' : 'items-end'}`}
            >
              <div className={`flex items-center gap-2 mb-1 px-2 mono text-[9px] uppercase tracking-widest ${m.role === 'teacher' ? 'text-success' : 'text-accent'}`}>
                {m.role === 'teacher' ? <Cpu size={10} /> : <User size={10} />}
                {m.role}
              </div>
              <div 
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg border ${
                  m.role === 'teacher' 
                    ? 'bg-surface border-border text-foreground-bright rounded-tl-none shadow-success/5' 
                    : 'bg-accent/10 border-accent/30 text-foreground-bright rounded-tr-none shadow-accent/5'
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      <div className="p-3 border-t border-border bg-background/50 flex items-center justify-between">
         <div className="flex items-center gap-2 mono text-[10px] text-foreground-muted">
            <Terminal size={12} /> SYSTEM_WAITING_FOR_UPLINK...
         </div>
      </div>
    </div>
  );
};

export default ConversationPanel;

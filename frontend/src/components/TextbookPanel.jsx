import React from 'react';
import { motion } from 'framer-motion';
import { Book, Image as ImageIcon, Search } from 'lucide-react';

const TextbookPanel = ({ text, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex-1 glass-panel p-10 flex flex-col items-center justify-center text-foreground-muted">
        <div className="animate-spin mb-4"><Search size={40} /></div>
        <p className="mono animate-pulse">SYNCING_NEURAL_PAGES...</p>
      </div>
    );
  }

  // Format the text to highlight image descriptions
  const formatContent = (raw) => {
    if (!raw) return "Waiting for subject selection...";
    
    // Split by [IMAGE: ...]
    const parts = raw.split(/(\[IMAGE:.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[IMAGE:')) {
        const desc = part.replace('[IMAGE:', '').replace(']', '');
        return (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-6 p-4 bg-accent/5 border border-accent/20 rounded-xl flex gap-4 items-start"
          >
            <div className="p-2 bg-accent/20 rounded-lg text-accent">
              <ImageIcon size={20} />
            </div>
            <div>
              <span className="mono text-[10px] text-accent uppercase block mb-1">Visual Reference</span>
              <p className="text-sm italic text-foreground-bright">{desc}</p>
            </div>
          </motion.div>
        );
      }
      return <p key={i} className="mb-4 text-lg leading-relaxed">{part}</p>;
    });
  };

  return (
    <div className="flex-1 glass-panel p-8 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Book className="text-accent" size={20} />
          <h2 className="font-bold text-gradient uppercase tracking-widest text-sm">NCERT_BUFFER_STREAM</h2>
        </div>
        <div className="mono text-[10px] text-foreground-muted bg-surface px-2 py-1 rounded">
          UTF-8 // EN_NCERT_CORE
        </div>
      </div>
      <div className="prose prose-invert max-w-none text-foreground-bright/90">
        {formatContent(text)}
      </div>
    </div>
  );
};

export default TextbookPanel;

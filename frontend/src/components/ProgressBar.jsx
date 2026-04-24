import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ current, total, chapterTitle }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="glass-card mb-8">
      <div className="flex justify-between items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="mono text-[10px] uppercase tracking-widest text-muted">NEURAL UPLINK ACTIVE</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">{chapterTitle}</h2>
          <p className="mono text-xs text-accent mt-1">MODULE SEGMENT {current} OF {total}</p>
        </div>
        
        <div className="flex-1 max-w-none">
          <div className="h-2 bg-background rounded-full overflow-hidden relative border border-border">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-accent"
            />
          </div>
          <div className="flex justify-between mt-1 px-1">
            <span className="mono text-[10px] uppercase text-muted">Retention Depth</span>
            <span className="mono text-[10px] uppercase text-accent font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

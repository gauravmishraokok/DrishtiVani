import React from 'react';
import { Mic, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceButton = ({ isListening, onClick, status = 'idle' }) => {
  // status: 'idle', 'listening', 'processing', 'speaking'

  return (
    <div className="flex flex-col items-center gap-4 relative">
      <motion.div 
        animate={isListening ? { scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`absolute -inset-6 rounded-full blur-2xl ${isListening ? 'bg-accent' : 'bg-transparent'}`}
      />
      
      <button 
        onClick={onClick}
        className={`voice-btn h-24 w-24 ${isListening ? 'listening' : ''}`}
      >
        {isListening ? (
          <Radio className="text-bright animate-pulse" size={40} />
        ) : (
          <Mic className="text-bright" size={40} />
        )}
      </button>
      
      <div className="glass-card px-6 py-2 mono text-[10px] tracking-widest uppercase text-muted">
        {isListening ? 'Neural Uplink Active' : 'Initiate Session'}
      </div>
    </div>
  );
};

export default VoiceButton;

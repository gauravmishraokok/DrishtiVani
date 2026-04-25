import React from 'react';
import { Mic, Radio, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VoiceButton = ({ isListening, onClick, status = 'idle' }) => {
  // status: 'idle', 'listening', 'processing', 'speaking'

  return (
    <div className="flex flex-col items-center gap-4 relative">
      <motion.div
        animate={isListening ? { scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={`absolute -inset-6 rounded-full blur-2xl ${isListening ? 'bg-[#EF4444]' : 'bg-transparent'}`}
      />

      <button
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        className={`voice-btn h-24 w-24 ${isListening ? 'listening' : ''} shadow-xl hover:scale-105 transition-transform`}
      >
        {isListening ? (
          <Radio className="text-white animate-pulse" size={40} />
        ) : status === 'speaking' ? (
          <Volume2 className="text-white animate-bounce" size={40} />
        ) : (
          <Mic className="text-white" size={40} />
        )}
      </button>

      <div className="bg-white border border-[#E8D5C4] px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#6B7280] shadow-sm">
        {isListening ? 'Listening...' : status === 'speaking' ? 'Speaking...' : 'Hold Space to Talk'}
      </div>
    </div>
  );
};

export default VoiceButton;

import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ current, total, chapterTitle, pageNum }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex justify-between items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Learning Session Active</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight">{chapterTitle}</h2>
          <p className="text-[10px] font-bold text-[#F97316] mt-1 uppercase tracking-widest">
            Section {current} of {total} {pageNum && `• Page ${pageNum}`}
          </p>
        </div>

        <div className="flex-1 max-w-md">
          <div className="h-2 bg-[#FFF1E6] rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-[#16A34A]"
            />
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] font-bold uppercase text-[#9CA3AF]">Progress</span>
            <span className="text-[10px] font-bold uppercase text-[#F97316]">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

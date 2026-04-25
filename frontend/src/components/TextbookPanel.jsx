import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Info } from 'lucide-react';

const TextbookPanel = ({ pageNum, isLoading, chapterTitle, subjectName, pageImagePath }) => {
    if (isLoading) {
        return (
            <div className="flex-1 bg-white border border-[#E8D5C4] rounded-2xl p-10 flex flex-col items-center justify-center text-[#9CA3AF] shadow-sm overflow-hidden">
                <div className="animate-spin mb-4 text-[#F97316]"><Search size={40} /></div>
                <p className="font-bold uppercase tracking-widest text-sm">Loading page...</p>
            </div>
        );
    }

    const imageUrl = pageImagePath ? `/${pageImagePath}` : null;

    return (
        <div className="bg-white border border-[#E8D5C4] rounded-2xl overflow-hidden flex flex-col shadow-sm h-full min-h-0">
            {/* Orange Header Strip - Slimmed */}
            <div className="bg-[#F97316] px-4 py-2 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-white/90" />
                    <div>
                        <h2 className="font-bold text-xs uppercase tracking-wider leading-none">
                            NCERT Textbook
                        </h2>
                    </div>
                </div>
            </div>

            {/* Main Image Area: NO SCROLLING, FIT TO CONTAINER */}
            <div className="flex-1 p-2 bg-[#F3F4F6] flex flex-col items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <motion.div
                        key={imageUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-xl shadow-inner p-1 h-full w-full flex items-center justify-center overflow-hidden"
                    >
                        <img
                            src={imageUrl}
                            alt={`Textbook Page ${pageNum}`}
                            className="max-w-full max-h-full object-contain block shadow-lg"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '<div class="p-20 text-center text-gray-400 font-bold uppercase text-xs">Page preview unavailable</div>';
                            }}
                        />
                    </motion.div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[#9CA3AF] opacity-50">
                        <BookOpen size={48} className="mb-4" />
                        <p className="font-bold uppercase tracking-widest text-xs">Waiting for Lesson Page...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TextbookPanel;

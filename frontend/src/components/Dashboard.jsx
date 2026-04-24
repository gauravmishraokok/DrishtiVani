import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Trophy, Target, PlayCircle, Zap, ChevronRight, Activity } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const studentId = localStorage.getItem('studentId');

  useEffect(() => {
    if (studentId) {
      api.getDashboardData(studentId).then(res => setData(res.data));
    }
  }, [studentId]);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <Activity className="animate-pulse text-accent" size={48} />
        <span className="mono uppercase tracking-widest">Sychronizing Neural Link...</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* AI Insights Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="skill-card col-span-full"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="text-warning" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">AI Tutor Insight</h2>
          </div>
          <span className="mono text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded border border-warning/20">REAL-TIME ANALYSIS</span>
        </div>
        <p className="text-lg font-medium leading-relaxed italic text-foreground-bright">"{data.aiInsight}"</p>
      </motion.div>

      {/* Progress Cards */}
      {data.subjects.map((sub, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="skill-card group hover:border-accent/40 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-hover rounded-lg border border-border">
                <BookOpen className="text-accent" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground-bright">{sub.subjectName}</h3>
                <p className="mono text-[11px]">{sub.chapterTitle}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="mono text-lg font-bold text-accent">{sub.completionPercent}%</span>
            </div>
          </div>
          
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${sub.completionPercent}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-accent"
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-surface-hover rounded border border-border">
              <Trophy size={14} className="text-warning" />
              <span className="mono text-[11px] text-foreground-bright">{sub.quizAvg}% accuracy</span>
            </div>
            <button className="text-accent hover:text-foreground-bright flex items-center gap-1 text-sm font-semibold transition-colors">
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      ))}

      {/* Weak Concepts Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="skill-card warning"
      >
        <div className="flex items-center gap-3 mb-4">
          <Target className="text-warning" size={20} />
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground-muted">Focus Directives</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.weakConcepts.length > 0 ? data.weakConcepts.map((concept, i) => (
            <span key={i} className="mono text-[10px] px-2 py-1 bg-warning/5 border border-warning/20 text-warning rounded uppercase">
              {concept}
            </span>
          )) : (
            <div className="flex items-center gap-2 py-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <p className="mono text-xs text-success uppercase tracking-widest">No Critical Weaknesses Detected</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Trophy, Clock, Brain, ChevronRight, Activity, Zap, Target, TrendingUp, Users, Award, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';

const DashboardPage = () => {
  const [activeModules, setActiveModules] = useState([]);
  const [dashboardMeta, setDashboardMeta] = useState({ weakConcepts: [], aiInsight: '' });
  const [catalog, setCatalog] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);

  const studentId = localStorage.getItem('studentId');
  const studentName = localStorage.getItem('studentName') || 'Learner';
  const navigate = useNavigate();
  const { speakText, setVoiceMode } = useVoice(studentId);
  const hasSpokenIntroRef = useRef(false);

  useEffect(() => {
    setVoiceMode('VT');
  }, [setVoiceMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Profile (to know class)
        const profileRes = await api.getProfile(studentId);
        setStudentProfile(profileRes.data);

        // 2. Get Dashboard Stats
        const dashRes = await api.getDashboardData(studentId);
        setActiveModules(dashRes.data.subjects);
        setDashboardMeta({
          weakConcepts: dashRes.data.weakConcepts || [],
          aiInsight: dashRes.data.aiInsight || ''
        });

        // 3. Get Full Catalog for this class
        const catalogRes = await api.getCatalog(profileRes.data.class_num);
        
        // Group catalog by subject
        const grouped = catalogRes.data.reduce((acc, ch) => {
          const sName = ch.subject_id.name;
          if (!acc[sName]) acc[sName] = { name: sName, chapters: [] };
          acc[sName].chapters.push(ch);
          return acc;
        }, {});
        
        setCatalog(Object.values(grouped));
        const pendingSubject = localStorage.getItem('pendingSubjectSelection');
        if (pendingSubject && grouped[pendingSubject]) {
          setSelectedSubject(pendingSubject);
          localStorage.removeItem('pendingSubjectSelection');
        } else if (Object.values(grouped).length > 0) {
          setSelectedSubject(Object.values(grouped)[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    if (studentId) fetchData();
  }, [studentId, setVoiceMode]);

  const computedStats = useMemo(() => {
    const completed = activeModules.filter((m) => m.completionPercent >= 100).length;
    const avgCompletion = activeModules.length
      ? Math.round(activeModules.reduce((sum, m) => sum + (m.completionPercent || 0), 0) / activeModules.length)
      : 0;
    const avgQuiz = activeModules.length
      ? Math.round(activeModules.reduce((sum, m) => sum + (m.quizAvg || 0), 0) / activeModules.length)
      : 0;
    return { completed, avgCompletion, avgQuiz };
  }, [activeModules]);

  useEffect(() => {
    if (!studentProfile || hasSpokenIntroRef.current) return;
    hasSpokenIntroRef.current = true;
    const intro = activeModules[0];
    const introText = intro
      ? `Welcome ${studentName}. You have completed ${intro.completionPercent} percent in ${intro.subjectName}. You can say read subject name, for example read Science, or say dashboard insights.`
      : `Welcome ${studentName}. Say read Science or read Mathematics to start learning.`;
    speakText(introText);
  }, [studentProfile, activeModules, studentName, speakText]);

  const handleStartChapter = (chapterId) => {
    navigate(`/learn/${selectedSubject || 'subject'}/${chapterId}`);
  };

  return (
    <div className="min-h-screen bg-background p-10 mt-1">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
          <div>
            <div className="mono text-xs text-accent uppercase tracking-[0.3em] mb-2">Neural_Status: ACTIVE</div>
            <h1 className="text-5xl font-bold text-bright font-display tracking-tight">
              Welcome back, <span className="text-gradient">{studentName}</span>
            </h1>
            <p className="text-muted mt-2 text-lg">Class {studentProfile?.class_num || '7'} • Unified Curriculum Access</p>
          </div>
          <div className="flex gap-4">
             <div className="glass-card py-3 px-6 flex items-center gap-3 border-accent/30 bg-accent/5">
                <Trophy className="text-warning" size={24} />
                <div>
                   <div className="text-2xl font-bold">{computedStats.avgQuiz}%</div>
                   <div className="text-[10px] mono uppercase text-muted">Avg Quiz Accuracy</div>
                </div>
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Modules', value: activeModules.length, icon: <Zap size={24} />, color: 'var(--accent)' },
            { label: 'Avg Completion', value: `${computedStats.avgCompletion}%`, icon: <Target size={24} />, color: 'var(--purple)' },
            { label: 'Completed Chapters', value: computedStats.completed, icon: <TrendingUp size={24} />, color: 'var(--success)' },
            { label: 'Weak Concepts', value: dashboardMeta.weakConcepts.length, icon: <Clock size={24} />, color: 'var(--warning)' },
          ].map((stat, index) => (
            <motion.div 
               key={index} 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.1 }}
               className="glass-card flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-6">
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <div className="h-1 w-12 bg-border rounded-full overflow-hidden">
                   <div className="h-full bg-current w-2/3" style={{ color: stat.color }}></div>
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-[10px] mono text-muted uppercase tracking-widest">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Classroom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {/* Subject Navigation */}
            <div className="flex gap-4 mb-4">
               {catalog.map(sub => (
                 <button 
                   key={sub.name}
                   onClick={() => setSelectedSubject(sub.name)}
                   className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                     selectedSubject === sub.name ? 'bg-accent text-bright' : 'bg-surface text-muted border border-border'
                   }`}
                 >
                   {sub.name}
                 </button>
               ))}
            </div>

            {/* Chapters Matrix */}
            <div className="glass-card min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-bold flex items-center gap-3">
                   <BookOpen className="text-accent" />
                   Available Knowledge Modules
                 </h2>
                 <span className="mono text-xs text-muted">{selectedSubject} Catalog</span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="wait">
                  {catalog.find(s => s.name === selectedSubject)?.chapters.map((chapter, idx) => {
                    const progress = activeModules.find(m => m.chapterTitle === chapter.title);
                    return (
                      <motion.div 
                        key={chapter._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-6 bg-surface-hover rounded-2xl border border-border group hover:border-accent/50 transition-all"
                      >
                        <div className="flex items-center gap-6">
                           <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center font-bold text-2xl text-accent group-hover:scale-110 transition-transform">
                              {chapter.chapter_num}
                           </div>
                           <div>
                              <h3 className="text-xl font-bold group-hover:text-accent transition-colors">{chapter.title}</h3>
                              <p className="text-sm text-muted">
                                {progress ? `${progress.completionPercent}% Mastered` : 'Not yet initiated'}
                              </p>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-8">
                           {progress && (
                              <div className="w-32 h-1.5 bg-background rounded-full overflow-hidden">
                                 <div className="h-full bg-accent" style={{ width: `${progress.completionPercent}%` }} />
                              </div>
                           )}
                           <button 
                             onClick={() => handleStartChapter(chapter._id)}
                             className="h-12 w-12 rounded-full border border-border flex items-center justify-center hover:bg-accent hover:border-accent group-2 transition-all"
                           >
                              <Play size={20} className="ml-1 group-hover:text-bright" />
                           </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {catalog.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted">
                     <Brain size={48} className="mb-4 opacity-20" />
                     <p>Neural catalog for Class {studentProfile?.class_num} is currently empty.</p>
                     <p className="text-xs uppercase mt-2">Check Admin Pipeline</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel: Insights */}
          <div className="space-y-6">
            <div className="glass-card">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Brain className="text-purple" />
                AI Learning Insights
              </h2>
              <p className="text-sm italic text-muted leading-relaxed">
                {dashboardMeta.aiInsight || "You're making progress. Complete a chapter to unlock detailed insights."}
              </p>
              <div className="mt-8 pt-8 border-t border-border">
                 <div className="text-[10px] mono uppercase text-muted mb-4">Focus_Areas</div>
                 <div className="flex flex-wrap gap-2">
                    {(dashboardMeta.weakConcepts.length ? dashboardMeta.weakConcepts : ['No weak concepts yet']).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-surface border border-border rounded-full text-xs text-accent">{tag}</span>
                    ))}
                 </div>
              </div>
            </div>

            <div className="glass-card bg-accent/5 border-accent/20">
               <h3 className="font-bold mb-2">Neural Link Tip</h3>
               <p className="text-xs text-muted">Hold <span className="px-1.5 py-0.5 bg-surface border border-border rounded text-accent">SPACEBAR</span> anywhere to talk to me. You can say "Start Science Chapter 2" or "Show me my progress".</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

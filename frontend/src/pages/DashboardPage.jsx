import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Trophy, Clock, CheckCircle, ChevronRight, Zap,
  Target, TrendingUp, Award, Play, Star, Calendar, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';
import { useGlobalVoice } from '../hooks/useGlobalVoice';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [isRelearning, setIsRelearning] = useState(false);

  const studentId = localStorage.getItem('studentId');
  const studentName = localStorage.getItem('studentName') || 'Learner';
  const navigate = useNavigate();
  const { speakText, setVoiceMode } = useVoice(studentId);
  const hasSpokenIntroRef = useRef(false);

  useEffect(() => {
    setVoiceMode('VT');
    fetchDashboard();
  }, [setVoiceMode]);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDashboardData(studentId);
      setData(res.data);
    } catch (err) {
      console.error('Data Load Fail', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChapter = useCallback((subjectName, chapterId) => {
    navigate(`/learn/${subjectName}/${chapterId}`);
  }, [navigate]);

  const handleTranscriptResult = useCallback((text) => {
    if (!text || !data) return;
    const lower = text.toLowerCase();

    // Command patterns: "Start Science", "Study Mathematics", "Open Chapter 1"
    if (lower.includes('start') || lower.includes('study') || lower.includes('open') || lower.includes('go to')) {
      // Find subject match
      const subMatch = data.subjects_data.find(s => lower.includes(s.subjectName.toLowerCase()));
      if (subMatch && subMatch.chapters.length > 0) {
        // Find chapter match in that subject
        const chMatch = subMatch.chapters.find(c => lower.includes(c.chapterTitle.toLowerCase()) || lower.includes(`chapter ${subMatch.chapters.indexOf(c) + 1}`));
        const targetChapter = chMatch || subMatch.chapters[0];

        speakText(`Sure thing, starting ${targetChapter.chapterTitle} in ${subMatch.subjectName}.`);
        setTimeout(() => handleStartChapter(subMatch.subjectName, targetChapter.chapterId), 2000);
        return;
      }
    }
  }, [data, handleStartChapter, speakText]);

  // Enable global voice listener for Dashboard commands
  useGlobalVoice(handleTranscriptResult, true);

  useEffect(() => {
    if (!data || hasSpokenIntroRef.current) return;
    hasSpokenIntroRef.current = true;

    const subjects = data.subjects_data?.map(s => s.subjectName).join(', ');
    const introText = subjects
      ? `Welcome back, ${studentName}. I have ${subjects} ready for you to study today. Just say "Start" followed by the subject name to begin!`
      : `Welcome back, ${studentName}. You have a study streak of ${data.study_streak_days} days. Keep it up!`;

    speakText(introText);
  }, [data, studentName, speakText]);

  const handleRelearn = async (concept) => {
    try {
      setIsRelearning(true);
      speakText(`Let me explain ${concept} for you.`, 'VT');
      const res = await api.sendCommand(studentId, `Explain the concept of ${concept} briefly.`);
      if (res.data && res.data.text) {
        speakText(res.data.text, 'VT');
        alert(`AI Tutor: ${res.data.text}`);
      }
    } catch (err) {
      console.error('Relearn fail', err);
    } finally {
      setIsRelearning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-[#F97316]" size={48} />
          <p className="font-bold text-[#F97316] uppercase tracking-widest text-sm">Syncing your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] p-6 lg:p-10 font-inter">
      <div className="max-w-7xl mx-auto">

        {/* Top Header */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold text-[#1A1A1A] font-display mb-2">My Learning Journey</h1>
            <p className="text-[#6B7280] font-medium flex items-center gap-2">
              <Trophy size={18} className="text-[#F97316]" />
              {data?.study_streak_days}-Day Study Streak! You're on fire, {studentName}.
            </p>
          </div>
          <div className="flex bg-white border border-[#E8D5C4] rounded-2xl p-2 shadow-sm">
            <div className="px-6 py-3 text-center">
              <div className="text-2xl font-bold text-[#1A1A1A]">{data?.overall_completion}%</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">Completion</div>
            </div>
            <div className="w-px bg-[#E8D5C4] my-3" />
            <div className="px-6 py-3 text-center">
              <div className="text-2xl font-bold text-[#F97316]">{data?.overall_quiz_avg}%</div>
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">Avg Score</div>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Overall Progress', value: `${data?.overall_completion}%`, icon: <TrendingUp />, color: '#F97316', bg: '#FFF1E6' },
            { label: 'Chapters Done', value: data?.subjects_data?.reduce((a, s) => a + s.chapters.filter(c => c.completionPercent === 100).length, 0), icon: <CheckCircle />, color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Study Streak', value: `${data?.study_streak_days} Days`, icon: <Calendar />, color: '#2563EB', bg: '#DBEAFE' },
            { label: 'Average Score', value: `${data?.overall_quiz_avg}%`, icon: <Star />, color: '#EAB308', bg: '#FEF9C3' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white border border-[#E8D5C4] rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: stat.bg, color: stat.color }}>{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</div>
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            {(data?.subjects_data || []).map(sub => (
              <section key={sub.subjectId} className="bg-white border border-[#E8D5C4] rounded-[2rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[#FFF1E6] rounded-2xl flex items-center justify-center text-[#F97316]"><BookOpen /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A1A1A]">{sub.subjectName}</h2>
                      <p className="text-xs text-[#9CA3AF] font-bold uppercase">{sub.chapters.length} Chapters total</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {sub.chapters.map((ch, index) => (
                    <div key={ch.chapterId} className="border border-[#E8D5C4] rounded-2xl p-6 hover:border-[#F97316] transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="bg-[#FFF1E6] text-[#F97316] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Chapter {ch.chapterNum || index + 1}</span>
                            <h3 className="text-lg font-bold text-[#1A1A1A]">{ch.chapterTitle}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden max-w-[200px]">
                              <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${ch.completionPercent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-[#16A34A]">{ch.completionPercent}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Scores ... */}
                          <div className="text-center bg-[#FFF8F3] px-4 py-2 rounded-xl border border-[#E8D5C4]">
                            <div className="text-xs font-bold text-[#1A1A1A]">{ch.mid_quiz_score ?? '-'}/100</div>
                            <div className="text-[8px] font-bold text-[#9CA3AF] uppercase">Mid Quiz</div>
                          </div>
                          <div className="text-center bg-[#FFF8F3] px-4 py-2 rounded-xl border border-[#E8D5C4]">
                            <div className="text-xs font-bold text-[#1A1A1A]">{ch.final_quiz_score ?? '-'}/100</div>
                            <div className="text-[8px] font-bold text-[#9CA3AF] uppercase">Final Quiz</div>
                          </div>
                          <button onClick={() => handleStartChapter(sub.subjectName, ch.chapterId)}
                            className="h-12 w-12 rounded-full bg-[#F97316] text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-[#F97316]/20">
                            <Play size={20} className="ml-1" />
                          </button>
                        </div>
                      </div>
                      {/* Mistakes ... */}
                      {(ch.mid_quiz_mistakes?.length > 0 || ch.final_quiz_mistakes?.length > 0) && (
                        <button onClick={() => setExpandedChapter(expandedChapter === ch.chapterId ? null : ch.chapterId)} className="mt-4 flex items-center gap-2 text-xs font-bold text-[#F97316] uppercase hover:underline">
                          {expandedChapter === ch.chapterId ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expandedChapter === ch.chapterId ? 'Hide Mistakes' : 'View Mistakes'}
                        </button>
                      )}
                      <AnimatePresence>
                        {expandedChapter === ch.chapterId && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#FFF8F3] rounded-xl mt-4 border border-[#FED7AA]">
                            <div className="p-6 space-y-4">
                              <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-widest mb-4">Quiz Corrections</h4>
                              {[...ch.mid_quiz_mistakes, ...ch.final_quiz_mistakes].map((m, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-[#E8D5C4] relative group">
                                  <div className="flex gap-4 items-start">
                                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-1"><AlertCircle size={14} /></div>
                                    <div className="flex-1">
                                      <p className="text-sm font-bold text-[#1A1A1A] mb-2">{m.question}</p>
                                      <div className="flex flex-wrap gap-4 text-[11px]">
                                        <span className="text-[#6B7280]">Your Answer: <span className="text-red-500 font-bold">{m.selected}</span></span>
                                        <span className="text-[#6B7280]">Correct Answer: <span className="text-green-600 font-bold">{m.correct}</span></span>
                                        <span className="bg-[#FFF1E6] text-[#F97316] px-2 py-0.5 rounded-full font-bold uppercase">{m.concept}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => handleRelearn(m.concept)} disabled={isRelearning} className="text-[10px] font-bold text-[#F97316] uppercase flex items-center gap-1 hover:bg-[#FFF1E6] px-3 py-1.5 rounded-lg border border-[#FED7AA] transition-all">
                                      <MessageSquare size={12} /> {isRelearning ? 'Speaking...' : 'Re-learn'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {data?.subjects_data?.length === 0 && (
              <div className="bg-white border-2 border-dashed border-[#E8D5C4] rounded-[2rem] p-20 text-center space-y-4">
                <BookOpen size={64} className="mx-auto text-[#9CA3AF] opacity-20" />
                <h3 className="text-xl font-bold text-[#1A1A1A]">No subjects available yet</h3>
                <p className="text-[#6B7280]">Add some textbooks in the Admin Panel to get started!</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {/* Keeping AI Insight as a text element for screen readers, but streamlined */}
            <div className="bg-white border border-[#E8D5C4] rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-3"><Zap className="text-[#F97316]" size={20} /> AI Learning Insight</h3>
              <div className="bg-[#FFF8F3] border-l-4 border-[#F97316] p-5 rounded-r-2xl">
                <p className="text-sm italic text-[#1A1A1A] leading-relaxed">"{data?.ai_insight || 'Welcome to your classroom.'}"</p>
              </div>
            </div>

            <div className="bg-white border border-[#E8D5C4] rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-3"><Award className="text-[#EAB308]" size={22} /> Achievements</h3>
              <div className="space-y-4">
                {data?.achievements?.map(ach => (
                  <div key={ach.id} className={`p-5 rounded-2xl border flex items-start gap-4 transition-all shadow-sm ${ach.id === 'high_scorer' ? 'bg-[#DCFCE7] border-[#16A34A]/20' : ach.id === 'first_chapter' ? 'bg-[#FEF9C3] border-[#EAB308]/20' : 'bg-[#DBEAFE] border-[#2563EB]/20'}`}>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm text-xl flex-shrink-0">{ach.id === 'high_scorer' ? '⭐️' : ach.id === 'first_chapter' ? '🏅' : '🔥'}</div>
                    <div><div className="font-bold text-[#1A1A1A] text-sm">{ach.title}</div><div className="text-[11px] text-[#6B7280] font-medium leading-snug mt-0.5">{ach.description}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

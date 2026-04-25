import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Book, Globe, Check, Mic, ChevronRight, ChevronLeft, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';
import { useGlobalVoice } from '../hooks/useGlobalVoice';

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    class_num: '7',
    subjects: [],
    language: 'English'
  });
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const navigate = useNavigate();

  const { speakText, setVoiceMode, isSpeaking } = useVoice('onboarding');
  const hasSpokenRef = useRef({});

  // Helper to match subjects more robustly
  const getSubjectMatch = (text) => {
    const lower = text.toLowerCase();
    const subjectMap = {
      'science': 'Science',
      'mathematics': 'Mathematics',
      'maths': 'Mathematics',
      'math': 'Mathematics',
      'english': 'English',
      'hindi': 'Hindi',
      'social science': 'Social Science',
      'social studies': 'Social Science',
      'history': 'Social Science',
      'geography': 'Social Science',
      'civics': 'Social Science',
      'sst': 'Social Science'
    };
    const key = Object.keys(subjectMap).find(k => lower.includes(key));
    // Specialized check for 'social' or 'social science'
    if (lower.includes('social') || lower.includes('sst')) return 'Social Science';
    if (lower.includes('science') && !lower.includes('social')) return 'Science';

    const foundKey = Object.keys(subjectMap).find(k => lower.includes(k));
    return foundKey ? subjectMap[foundKey] : null;
  };

  const handleTranscriptResult = useCallback((text) => {
    if (!text || isSpeaking) return;
    const lowerText = text.toLowerCase();
    const cleanText = text.replace(/my name is/i, '').replace(/i am/i, '').replace(/this is/i, '').replace(/[.,?!]/g, '').trim();

    if (needsInteraction) {
      if (/start|lets|let's|begin|next|go|ready|learning/.test(lowerText)) setNeedsInteraction(false);
      return;
    }

    if (step === 1) {
      if (!cleanText) return;
      const formattedName = cleanText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setFormData(prev => ({ ...prev, name: formattedName }));
      // AUTO MOVE TO NEXT
      setTimeout(() => setStep(2), 1000);
    }
    else if (step === 2) {
      const match = cleanText.match(/\d+/);
      if (match) {
        setFormData(prev => ({ ...prev, class_num: match[0] }));
        // AUTO MOVE TO NEXT
        setTimeout(() => setStep(3), 1000);
      }
    }
    else if (step === 3) {
      if (lowerText.includes('hindi')) {
        setFormData(prev => ({ ...prev, language: 'Hindi' }));
        setTimeout(() => setStep(4), 1000);
      } else if (lowerText.includes('english')) {
        setFormData(prev => ({ ...prev, language: 'English' }));
        setTimeout(() => setStep(4), 1000);
      }
    }
    else if (step === 4) {
      if (lowerText.includes('next') || lowerText.includes('continue') || lowerText.includes('done') || lowerText.includes('that is it')) {
        if (formData.subjects.length > 0) setStep(5);
        else speakText("Please select at least one subject first.");
        return;
      }
      const formalName = getSubjectMatch(lowerText);
      if (formalName && !formData.subjects.includes(formalName)) {
        setFormData(prev => ({ ...prev, subjects: [...prev.subjects, formalName] }));
        speakText(`Added ${formalName}. Any other subjects?`);
      }
    }
    else if (step === 5) {
      if (/yes|correct|proceed|continue|right|go|that is correct/.test(lowerText)) {
        handleFinish();
      } else if (/no|wrong|change|edit|incorrect/.test(lowerText)) {
        setStep(1);
        hasSpokenRef.current = {}; // Reset speech trackers
      }
    }
  }, [step, isSpeaking, speakText, formData.subjects, needsInteraction]);

  useGlobalVoice(handleTranscriptResult, true);

  useEffect(() => {
    setVoiceMode('VT');
  }, [setVoiceMode]);

  useEffect(() => {
    if (needsInteraction) return;
    if (hasSpokenRef.current[step]) return;

    if (step === 1) {
      speakText('Welcome to DrishtiVani. What is your name?');
    } else if (step === 2) {
      speakText(`Nice to meet you, ${formData.name}. Which class are you in?`);
    } else if (step === 3) {
      speakText('Great. Which language should I teach in? English or Hindi?');
    } else if (step === 4) {
      speakText('Which subjects do you want to study? You can say Science, Mathematics, or Social Science. Say Next when you are done.');
    } else if (step === 5) {
      const summary = `Hello ${formData.name}, you are in class ${formData.class_num} and your subjects are ${formData.subjects.join(' and ')}. Is that correct?`;
      speakText(summary);
    }
    hasSpokenRef.current[step] = true;
  }, [step, formData.name, formData.class_num, formData.subjects, speakText, needsInteraction]);

  const handleFinish = async () => {
    setIsSyncing(true);
    setError('');
    try {
      let finalStudent;
      const payload = {
        ...formData,
        class_num: parseInt(formData.class_num),
        language: formData.language === 'English' ? 'en' : 'hi'
      };
      try {
        const res = await api.onboard(payload);
        finalStudent = res.data;
      } catch (err) {
        if (err.response?.status === 400) {
          const loginRes = await api.login(formData.name);
          finalStudent = loginRes.data;
        } else throw err;
      }
      const sId = finalStudent._id || finalStudent.id;
      localStorage.setItem('studentId', sId);
      localStorage.setItem('studentName', finalStudent.name);
      speakText("Perfect. Let's head to your dashboard.");
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(`Error: ${err.message}`);
      speakText("I had trouble saving your profile. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const steps = [
    { title: "Name", icon: <User size={20} /> },
    { title: "Class", icon: <GraduationCap size={20} /> },
    { title: "Language", icon: <Globe size={20} /> },
    { title: "Subjects", icon: <BookOpen size={20} /> },
    { title: "Confirm", icon: <Check size={20} /> }
  ];

  if (needsInteraction) {
    return (
      <div className="min-h-screen bg-[#FFF8F3] flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 max-w-sm font-inter">
          <div className="h-24 w-24 bg-white border border-[#E8D5C4] rounded-3xl flex items-center justify-center mx-auto shadow-xl">
            <GraduationCap size={48} className="text-[#F97316]" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">DrishtiVani</h1>
          <p className="text-[#6B7280]">I am ready to help you study. Press the button or say "Start" to begin setup.</p>
          <button onClick={() => setNeedsInteraction(false)} className="btn-primary w-full py-5 text-xl justify-center shadow-lg">Start Setup</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] relative overflow-hidden font-inter">
      {/* Progress Head ... (omitted for brevity in thinking, but I'll write full code) ... */}
      <div className="fixed top-0 left-0 w-full bg-white border-b border-[#E8D5C4] p-4 z-[60]">
        <div className="max-w-4xl mx-auto flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Step {step} — {steps[step - 1].title}</span>
          <span className="text-xs font-bold text-[#16A34A]">{Math.round((step / 5) * 100)}% Ready</span>
        </div>
        <div className="max-w-4xl mx-auto h-2 bg-[#FFF1E6] rounded-full overflow-hidden">
          <motion.div animate={{ width: `${(step / 5) * 100}%` }} className="h-full bg-[#16A34A]" />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen p-6 pt-24">
        <div className="w-full max-w-2xl bg-white border border-[#E8D5C4] rounded-[2.5rem] p-10 shadow-2xl">
          <AnimatePresence mode="wait">
            {/* Render Step Content ... (I'll output full file in next call) ... */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                <h2 className="text-3xl font-bold font-display">What's your name?</h2>
                <input autoFocus value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[#FFF8F3] border-2 border-[#E8D5C4] rounded-2xl px-6 py-5 text-xl font-bold focus:border-[#F97316] outline-none text-center" placeholder="Say or type your name..." />
                <div className="flex justify-center"><div className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#F97316] text-white font-bold shadow-lg"><Mic size={22} /> Hold Space to Talk</div></div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                <h2 className="text-3xl font-bold font-display">Which grade?</h2>
                <div className="grid grid-cols-4 gap-4">
                  {[6, 7, 8, 9, 10, 11, 12].map(num => (
                    <button key={num} onClick={() => { setFormData({ ...formData, class_num: num.toString() }); setTimeout(() => setStep(3), 500); }} className={`p-6 rounded-2xl border-2 font-bold text-2xl ${formData.class_num === num.toString() ? 'bg-[#F97316] text-white' : 'bg-[#FFF8F3]'}`}>{num}</button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                <h2 className="text-3xl font-bold font-display">Language</h2>
                <div className="grid grid-cols-2 gap-6">
                  {['English', 'Hindi'].map(lang => (
                    <button key={lang} onClick={() => { setFormData({ ...formData, language: lang }); setTimeout(() => setStep(4), 500); }} className={`p-10 rounded-2xl border-2 font-bold text-2xl ${formData.language === lang ? 'bg-[#F97316] text-white' : 'bg-[#FFF8F3]'}`}>{lang}</button>
                  ))}
                </div>
              </motion.div>
            )}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center"><h2 className="text-3xl font-bold">Pick your subjects</h2><p className="text-[#6B7280]">Say the subject names, then say "Next".</p></div>
                <div className="grid grid-cols-1 gap-3">
                  {['Science', 'Mathematics', 'English', 'Hindi', 'Social Science'].map(subj => (
                    <button key={subj} onClick={() => { const isSelected = formData.subjects.includes(subj); const newSubjs = isSelected ? formData.subjects.filter(s => s !== subj) : [...formData.subjects, subj]; setFormData({ ...formData, subjects: newSubjs }); }} className={`p-5 rounded-2xl border-2 flex items-center justify-between font-bold ${formData.subjects.includes(subj) ? 'bg-[#DCFCE7] border-[#16A34A] text-[#16A34A]' : 'bg-[#FFF8F3]'}`}>
                      {subj}
                      {formData.subjects.includes(subj) ? <Check size={24} /> : <div className="h-6 w-6 rounded-full border border-[#E8D5C4]" />}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center pt-4"><button onClick={() => setStep(5)} disabled={formData.subjects.length === 0} className="btn-primary px-12 py-4">Confirm Subjects</button></div>
              </motion.div>
            )}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 text-center">
                <h2 className="text-4xl font-bold">Final Check</h2>
                <div className="bg-[#FFF8F3] border rounded-3xl p-8 space-y-4">
                  <p className="text-lg font-bold">"Hello {formData.name}, you are in class {formData.class_num} and your subjects are {formData.subjects.join(', ')}."</p>
                  <p className="text-sm text-[#F97316] font-bold uppercase tracking-widest">Say "Yes" if correct</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button onClick={handleFinish} disabled={isSyncing} className="btn-primary w-full py-6 text-xl justify-center shadow-xl">{isSyncing ? <Loader2 className="animate-spin" /> : "Yes, Let's Begin"}</button>
                  <button onClick={() => setStep(1)} className="text-[#9CA3AF] font-bold">No, change details</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;

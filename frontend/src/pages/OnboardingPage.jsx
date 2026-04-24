import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Book, Sparkles, ChevronRight, Check, Mic, Brain, Zap, Shield, Loader2, ChevronDown, Activity, Radio } from 'lucide-react';
import api from '../services/api';
import { useVoice } from '../hooks/useVoice';
import { useGlobalVoice } from '../hooks/useGlobalVoice';

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    class_num: '7',
    subjects: ['Science', 'Mathematics'],
    language: 'English'
  });
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  // 1. Initial Voice for Guidance
  const { 
    speakText, 
    setVoiceMode,
    isSpeaking 
  } = useVoice('onboarding');

  const hasSpokenRef = useRef({});
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  // 2. Global Voice Interceptor for Spacebar handling
  const handleTranscriptResult = useCallback((text) => {
    if (!text || isSpeaking) return;
    
    // Auto-clean: Remove filler phrases to extract ONLY the name
    const cleanText = text
      .replace(/my name is/i, '')
      .replace(/i am/i, '')
      .replace(/this is/i, '')
      .replace(/[.,?!]/g, '')
      .trim();

    if (!cleanText) return;

    if (step === 1) {
      // Capitalize first letters
      const formattedName = cleanText.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setFormData(prev => ({ ...prev, name: formattedName }));
      setTimeout(() => setStep(2), 600);
    } else if (step === 2) {
      const match = cleanText.match(/\d+/);
      if (match) {
        setFormData(prev => ({ ...prev, class_num: match[0] }));
        setTimeout(() => {
          setStep(3);
          setIsAwaitingConfirmation(true);
        }, 600);
      } else {
        speakText("I didn't quite catch the status bit. Which class are you in?");
      }
    } else if (step === 3 && isAwaitingConfirmation) {
      const lowered = cleanText.toLowerCase();
      const isYes = /yes|correct|proceed|continue|right/.test(lowered);
      const isNo = /no|wrong|change|edit|incorrect/.test(lowered);
      if (isYes) {
        handleFinish();
      } else if (isNo) {
        speakText("No problem. Let's update your details. Please say your name again.");
        setFormData(prev => ({ ...prev, name: '' }));
        setStep(1);
        setIsAwaitingConfirmation(false);
      }
    }
  }, [step, isSpeaking, speakText, isAwaitingConfirmation]);

  // Hook into the global spacebar logic
  const { isListening: isGlobalListening } = useGlobalVoice(handleTranscriptResult, true);

  useEffect(() => {
    setVoiceMode('VT');
  }, [setVoiceMode]);

  useEffect(() => {
    if (hasSpokenRef.current[step]) return;

    if (step === 1) {
      speakText('Welcome to Drishti Vani. Please tell me your name.');
    } else if (step === 2) {
      speakText(`Great, ${formData.name}. Now tell me your class.`);
    } else if (step === 3) {
      speakText(`You are ${formData.name} from class ${formData.class_num}. Is this correct, and do you want to proceed with learning?`);
    }
    hasSpokenRef.current[step] = true;
  }, [step, formData.name, formData.class_num, speakText]);

  const handleFinish = async () => {
    setIsSyncing(true);
    setError('');
    try {
      // Logic change: If student exists, we just 'login'
      let finalStudent;
      try {
        const res = await api.onboard({
          ...formData,
          class_num: parseInt(formData.class_num),
          language: formData.language === 'English' ? 'en' : 'hi'
        });
        finalStudent = res.data;
      } catch (err) {
         if (err.response?.status === 400) {
            console.log('[Sync] Student exists, logging in...');
            try {
              const loginRes = await api.login(formData.name);
              finalStudent = loginRes.data;
            } catch (loginErr) {
              if (loginErr.response?.status === 300) {
                const choices = loginErr.response.data?.choices || [];
                const targetClass = parseInt(formData.class_num, 10);
                const pickedStudent =
                  choices.find((choice) => Number(choice.class_num) === targetClass) ||
                  choices[0];
                finalStudent = pickedStudent
                  ? { ...pickedStudent, _id: pickedStudent._id || pickedStudent.id }
                  : null;
              } else {
                throw loginErr;
              }
            }
         } else {
            throw err;
         }
      }

      if (!finalStudent?._id) throw new Error('Invalid Link Response');

      localStorage.setItem('studentId', finalStudent._id);
      localStorage.setItem('studentName', finalStudent.name);
      
      setIsAwaitingConfirmation(false);
      speakText("Profile confirmed. Entering your dashboard now.");
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      setError('Uplink synchronization failed. Check your connection.');
      speakText("Something went wrong with the uplink. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const steps = [
    { title: "Identity", icon: <User size={18} /> },
    { title: "Grade", icon: <Book size={18} /> },
    { title: "Sync", icon: <Sparkles size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Polish */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="glass-card p-10 border-border/50">
          {/* Progress Tabs */}
          <div className="flex justify-center gap-12 mb-12 relative">
             <div className="absolute top-1/2 left-1/4 right-1/4 h-[1px] bg-border z-0" />
             {steps.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-3 relative z-10">
                   <div className={`h-12 w-12 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                     step > i + 1 ? 'bg-success border-success' : step === i + 1 ? 'bg-accent border-accent shadow-[0_0_15px_rgba(47,129,247,0.4)]' : 'bg-surface border-border'
                   }`}>
                      {step > i + 1 ? <Check size={20} /> : s.icon}
                   </div>
                   <span className={`text-[10px] mono uppercase tracking-widest ${step === i + 1 ? 'text-accent' : 'text-muted'}`}>{s.title}</span>
                </div>
             ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center">
                   <h2 className="text-4xl font-bold font-display mb-3">Identity <span className="text-gradient">Verification</span></h2>
                   <p className="text-muted">Initiating neural profile mapping sequence.</p>
                </div>
                
                <div className="space-y-2">
                   <label className="mono text-[10px] text-muted tracking-widest uppercase ml-1">Full_Name_Protocol</label>
                   <div className="relative">
                      <input 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-2xl px-6 py-5 text-xl font-bold focus:border-accent outline-none transition-all pr-20"
                        placeholder="Neural ID..."
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                         {isGlobalListening && (
                            <div className="flex gap-1">
                               <div className="w-1 h-3 bg-accent animate-pulse" />
                               <div className="w-1 h-5 bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
                               <div className="w-1 h-3 bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
                            </div>
                         )}
                         <Mic className={`${isGlobalListening ? 'text-accent' : 'text-muted'}`} size={20} />
                      </div>
                   </div>
                </div>
                
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center gap-4">
                   <Activity className="text-accent" size={24} />
                   <p className="text-xs text-muted leading-relaxed">System is calibrated. <span className="text-accent font-bold">Press SPACEBAR once</span> to start speaking and press again to stop.</p>
                </div>

                <button onClick={() => setStep(2)} disabled={!formData.name} className="btn-primary w-full py-5 text-lg justify-center shadow-[0_4px_20px_rgba(35,134,54,0.2)]">
                   ESTABLISH IDENTITY
                   <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="text-center">
                   <h2 className="text-4xl font-bold font-display mb-3">Grade <span className="text-gradient">Configuration</span></h2>
                   <p className="text-muted">Loading curriculum vectors for <span className="text-bright font-bold">{formData.name}</span>.</p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                   {[6, 7, 8, 9, 10, 11, 12].map(num => (
                     <button 
                       key={num}
                       onClick={() => setFormData({ ...formData, class_num: num.toString() })}
                       className={`p-6 rounded-2xl border-2 font-bold text-xl transition-all ${
                         formData.class_num === num.toString() ? 'bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(47,129,247,0.2)]' : 'bg-surface border-border text-muted hover:border-accent/30'
                       }`}
                     >
                       {num}
                     </button>
                   ))}
                </div>

                <div className="p-4 bg-purple/5 border border-purple/20 rounded-xl flex items-center gap-4">
                   <Zap className="text-purple" size={24} />
                   <p className="text-xs text-muted leading-relaxed">Neural shortcut: Press <span className="text-purple font-bold">SPACEBAR</span>, say "I am in class 9", then press space again to auto-jump.</p>
                </div>

                <button onClick={() => setStep(3)} className="btn-primary w-full py-5 text-lg justify-center">
                   CONFIGURE CURRICULUM
                   <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 text-center">
                <div>
                   <h2 className="text-4xl font-bold font-display mb-3">Permanent <span className="text-gradient">Neural Sync</span></h2>
                   <p className="text-muted">Ready to bridge the connection to the Drishti Vani Classroom.</p>
                </div>

                <div className="flex justify-center flex-col items-center">
                   <div className="h-40 w-40 relative flex items-center justify-center">
                      <div className="absolute inset-0 border-2 border-dashed border-accent/20 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
                      <div className="absolute inset-4 border border-accent/40 rounded-full animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
                      <Brain className="text-accent" size={64} />
                   </div>
                   <div className="mt-8 space-y-1">
                      <p className="font-bold text-xl">{formData.name}</p>
                      <p className="text-muted mono text-xs uppercase tracking-widest">Class {formData.class_num} // Global English</p>
                   </div>
                </div>

                {error && <p className="text-danger text-sm font-bold animate-pulse">{error}</p>}

                <button 
                  onClick={handleFinish} 
                  disabled={isSyncing}
                  className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 transition-all ${
                    isSyncing ? 'bg-surface text-muted' : 'bg-accent hover:bg-accent/90 text-bright shadow-[0_8px_32px_rgba(47,129,247,0.3)]'
                  }`}
                >
                   {isSyncing ? (
                     <>
                       <div className="animate-spin h-6 w-6 border-2 border-muted border-t-transparent rounded-full" />
                       STABILIZING_UPLINK...
                     </>
                   ) : (
                     <>
                       <Shield size={24} />
                       ESTABLISH TERMINAL LINK
                     </>
                   )}
                </button>
                <p className="text-xs text-muted">Voice shortcut: say "yes, proceed" to continue without pressing the button.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;

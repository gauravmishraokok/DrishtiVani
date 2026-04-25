import { useEffect } from 'react';
import { useVoice } from './useVoice';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * GlobalVoiceHandler listens for the Spacebar keydown event
 * and handles voice commands like "Go to dashboard" or "Start science chapter 1"
 * from ANY page in the app.
 */
export const useGlobalVoice = (onTranscript, enabled = true) => {
  const studentId = localStorage.getItem('studentId');
  const { startListening, stopListening, speakText, isListening, setVoiceMode } = useVoice(studentId);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    // CRITICAL: Dashboard and other global routes MUST stay in VT mode.
    // AGENT (Vapi) is reserved exclusively for the Learning Page.
    setVoiceMode('VT');
  }, [setVoiceMode, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = async (e) => {
      if (e.code === 'Space' && !e.repeat) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (!isListening) {
            await startListening();
          }
        }
      }
    };

    const handleKeyUp = async (e) => {
      if (e.code === 'Space') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const transcript = await stopListening();
          if (!transcript) return;

          const lowerT = transcript.toLowerCase();
          const pendingSubject = localStorage.getItem('pendingSubjectSelection');

          // 1. GLOBAL NAVIGATION & REPORTS (HIGHEST PRIORITY)
          if (lowerT.includes('dashboard') || lowerT.includes('home')) {
            speakText("Navigating to your dashboard.");
            navigate('/dashboard');
            return;
          }

          if (lowerT.includes('admin') || lowerT.includes('teacher panel')) {
            speakText("Opening the admin panel.");
            navigate('/admin');
            return;
          }

          if (lowerT.includes('go back')) {
            speakText("Going back.");
            navigate(-1);
            return;
          }

          if (lowerT.includes('progress')) {
            try {
              const res = await api.getDashboardData(studentId);
              const d = res.data;
              const subCount = d.subjects_data?.length || 0;
              const summary = `You have completed ${d.overall_completion} percent of your syllabus with an average score of ${d.overall_quiz_avg} percent across ${subCount} subjects. ${d.ai_insight || ''}`;
              speakText(summary);
            } catch (err) {
              speakText("I couldn't fetch your progress right now.");
            }
            return;
          }

          if (lowerT.includes('report') || lowerT.includes('email') || lowerT.includes('mail')) {
            speakText("Sending your progress report to the registered email address.");
            try {
              const res = await api.emailReport(studentId);
              speakText(`Done! Your progress report has been sent to ${res.data.recipient || 'the trainer'}.`);
            } catch (err) {
              speakText("I'm sorry, I couldn't send the report at this time.");
              console.error("Email fail", err);
            }
            return;
          }

          // 2. PAGE-SPECIFIC HANDLER (CALLBACK)
          if (onTranscript) {
            onTranscript(transcript);
            return;
          }

          // 3. FALLBACK COMMANDS
          if (lowerT.includes('classroom') || lowerT.includes('learn') || lowerT.includes('read')) {
            const chapterMatch = lowerT.match(/chapter\s*(\d+)|\b(\d+)\b/i);
            const subjectMatch = lowerT.match(/science|mathematics|maths|math|english|hindi|social\s*science|sst/i);
            const subjectToken = subjectMatch ? subjectMatch[0].replace(/\s+/g, ' ').trim() : null;
            const normalizedSubject = subjectToken === 'maths' || subjectToken === 'math' ? 'mathematics' : subjectToken;

            if (normalizedSubject && chapterMatch) {
              const chapterNumber = chapterMatch[1] || chapterMatch[2];
              speakText(`Opening ${normalizedSubject} chapter ${chapterNumber}. Resuming your progress.`);
              navigate(`/learn/${normalizedSubject}/${chapterNumber}`);
              return;
            }

            if (normalizedSubject) {
              localStorage.setItem('pendingSubjectSelection', normalizedSubject);
              speakText(`Okay, ${normalizedSubject} selected. Tell me which chapter you want to learn.`);
              navigate('/dashboard');
              return;
            }

            speakText("Opening the classroom. Please tell me which subject you want to learn.");
            navigate('/dashboard');
            return;
          }

          if (pendingSubject) {
            const chapterMatch = lowerT.match(/chapter\s+(\d+)|\b(\d+)\b/i);
            if (chapterMatch) {
              const chapterNumber = chapterMatch[1] || chapterMatch[2];
              speakText(`Opening ${pendingSubject} chapter ${chapterNumber}.`);
              localStorage.removeItem('pendingSubjectSelection');
              navigate(`/learn/${pendingSubject}/${chapterNumber}`);
              return;
            }
            speakText(`I heard ${pendingSubject}. Please tell me the chapter number, for example chapter 2.`);
            return;
          }

          if (studentId) {
            try {
              const res = await api.sendCommand(studentId, transcript);
              if (res.data.useClientTTS !== false) {
                speakText(res.data.text, 'VT');
              }
              if (res.data.action === 'START_CHAPTER') {
                const hintedSubject = lowerT.includes('math') ? 'mathematics' : lowerT.includes('science') ? 'science' : 'subject';
                navigate(`/learn/${hintedSubject}/${res.data.chapterId}`);
              }
            } catch (err) {
              console.error('Command failed', err);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [studentId, navigate, startListening, stopListening, speakText, onTranscript, enabled, isListening]);

  return { isListening };
};

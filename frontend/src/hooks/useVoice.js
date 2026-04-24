import Vapi from '@vapi-ai/web';
import { useState, useEffect, useRef, useCallback } from 'react';

const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID; 
const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

const vapi = new Vapi(PUBLIC_KEY);
let sharedStartPromise = null;
let sharedCallActive = false;
const MIN_LISTEN_MS = 3000;
const AGENT_FINALIZE_MS = 4000;

export const useVoice = (sessionId) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceMode, setVoiceModeState] = useState('VT'); // VT | AGENT
  const [lastError, setLastError] = useState('');
  const latestTranscript = useRef('');
  const startPromiseRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionResolverRef = useRef(null);
  const listeningRef = useRef(false);
  const listenStartAtRef = useRef(0);

  useEffect(() => {
    const onCallStart = () => {
      console.log('[Vapi] Bridge Active');
      sharedCallActive = true;
      setIsCallActive(true);
      vapi.setMuted(true); 
    };

    const onCallEnd = () => {
      console.log('[Vapi] Bridge Closed');
      sharedCallActive = false;
      listeningRef.current = false;
      setIsCallActive(false);
      setIsListening(false);
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    
    const onMessage = (message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        latestTranscript.current = message.transcript;
        setTranscript(message.transcript);
      }
    };

    const onError = (err) => {
      console.error('[Vapi] Comm Error:', err);
      setLastError(err?.errorMsg || err?.message || 'Vapi communication error');
      sharedCallActive = false;
      listeningRef.current = false;
      setIsCallActive(false);
      setIsListening(false);
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('message', onMessage);
    vapi.on('error', onError);

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end', onSpeechEnd);
      vapi.off('message', onMessage);
      vapi.off('error', onError);
    };
  }, []);

  const startVoiceSession = async (targetMode = voiceMode) => {
    if (targetMode !== 'AGENT') return false;
    if (sharedCallActive || isCallActive) return true;
    if (sharedStartPromise) return sharedStartPromise;
    try {
      sharedStartPromise = vapi.start(ASSISTANT_ID);
      startPromiseRef.current = sharedStartPromise;
      await sharedStartPromise;
      return true;
    } catch (err) {
      console.error('[Vapi] Start Failed:', err);
      return false;
    } finally {
      startPromiseRef.current = null;
      sharedStartPromise = null;
    }
  };

  const startListening = async () => {
    if (listeningRef.current) return;
    latestTranscript.current = '';
    if (voiceMode === 'VT') {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (Recognition) {
        if (!recognitionRef.current) {
          const recognition = new Recognition();
          recognition.lang = 'en-IN';
          recognition.interimResults = false;
          recognition.continuous = false;
          recognition.maxAlternatives = 1;
          recognition.onresult = (event) => {
            const finalText = event?.results?.[0]?.[0]?.transcript?.trim() || '';
            latestTranscript.current = finalText;
            setTranscript(finalText);
          };
          recognition.onerror = () => {
            setLastError('Browser speech recognition error');
            listeningRef.current = false;
            setIsListening(false);
          };
          recognition.onend = () => {
            listeningRef.current = false;
            setIsListening(false);
            if (recognitionResolverRef.current) {
              recognitionResolverRef.current(latestTranscript.current);
              recognitionResolverRef.current = null;
            }
          };
          recognitionRef.current = recognition;
        }
        listeningRef.current = true;
        listenStartAtRef.current = Date.now();
        recognitionRef.current.start();
        setIsListening(true);
        return;
      }
      console.warn('[Voice] Browser speech recognition unavailable in VT mode.');
      setLastError('Browser speech recognition unavailable');
      return;
    }

    const ready = await startVoiceSession();
    if (!ready) return;
    try {
      listeningRef.current = true;
      listenStartAtRef.current = Date.now();
      vapi.setMuted(false);
      setIsListening(true);
    } catch (err) {
      listeningRef.current = false;
      console.error('[Vapi] Failed to unmute for listening:', err);
      setLastError('Agent mic activation failed');
    }
  };

  const stopListening = async () => {
    if (!listeningRef.current) return '';
    const elapsedMs = Date.now() - (listenStartAtRef.current || 0);
    if (elapsedMs < MIN_LISTEN_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_LISTEN_MS - elapsedMs));
    }
    listeningRef.current = false;
    if (voiceMode === 'VT' && recognitionRef.current) {
      return new Promise((resolve) => {
        recognitionResolverRef.current = resolve;
        recognitionRef.current.stop();
      });
    }

    try {
      vapi.setMuted(true);
    } catch (err) {
      console.error('[Vapi] Failed to mute:', err);
      setLastError('Agent mute failed');
    }
    setIsListening(false);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(latestTranscript.current);
      }, AGENT_FINALIZE_MS);
    });
  };

  const setVoiceMode = useCallback(async (nextMode) => {
    const mode = nextMode === 'AGENT' ? 'AGENT' : 'VT';
    if (mode === voiceMode) return;

    listeningRef.current = false;
    setIsListening(false);

    if (mode === 'AGENT') {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setVoiceModeState('AGENT');
      return;
    }

    // Switching back to VT: ensure agent call is fully stopped.
    try {
      await vapi.stop();
    } catch (err) {
      // Ignore stop errors when no active call exists.
    }
    sharedCallActive = false;
    setIsCallActive(false);
    setVoiceModeState('VT');
  }, [voiceMode]);

  const speakTextWithMode = async (text, targetMode = null) => {
    if (!text) return;
    const effectiveMode = targetMode || voiceMode;

    if (effectiveMode === 'VT') {
      if (!window.speechSynthesis) {
        console.warn('[Voice] Browser TTS unavailable in VT mode.');
        setLastError('Browser TTS unavailable');
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1;
      utterance.pitch = 1;
      const availableVoices = window.speechSynthesis.getVoices();
      const preferredVoiceName = localStorage.getItem('preferredVoiceName');
      const selectedVoice =
        (preferredVoiceName && availableVoices.find((v) => v.name === preferredVoiceName)) ||
        availableVoices.find((v) => /female|zira|samantha|google uk english female/i.test(v.name)) ||
        availableVoices.find((v) => /^en/i.test(v.lang));
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    const ready = await startVoiceSession('AGENT');
    if (!ready) return;
    vapi.send({
      type: 'add-message',
      message: { role: 'assistant', content: text },
    });
  };

  return { 
    startVoiceSession,
    startListening, 
    stopListening, 
    speakText: speakTextWithMode,
    setVoiceMode,
    voiceMode,
    isCallActive,
    isListening, 
    isSpeaking,
    transcript,
    diagnostics: {
      sttSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      ttsSupported: typeof window !== 'undefined' && !!window.speechSynthesis,
      activeEngine: voiceMode === 'VT' ? 'browser' : 'vapi',
      listeningInternal: listeningRef.current,
      lastError,
    }
  };
};

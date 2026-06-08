import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Play, Pause, Volume2, Square, Loader,
  AlertCircle, BookOpen, Compass, Scroll, Zap, Star, RefreshCw
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { ModePills } from '../components/ui/ModePills';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { apiService } from '../services/api';
import { WHISPER_LANG_CODES, type StoryMode, type Language } from '../types';

interface LibraryEntry {
  id:       string;
  title:    string;
  place:    string;
  duration: string;
  preview:  string;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'playing' | 'error';

const MODE_META: Record<StoryMode, { color: string; gradient: string; border: string; icon: React.ReactNode }> = {
  'Guide Mode':   { color: '#C9A96E', gradient: 'from-amber-500/12 to-yellow-600/4',   border: 'border-amber-500/22',  icon: <Compass size={13} />  },
  'Story Mode':   { color: '#C3978B', gradient: 'from-purple-500/12 to-rose-600/4',    border: 'border-purple-400/22', icon: <BookOpen size={13} /> },
  'Deep History': { color: '#8B9DC3', gradient: 'from-blue-500/12 to-indigo-600/4',    border: 'border-blue-400/22',   icon: <BookOpen size={13} /> },
  'Mythology':    { color: '#A08BC3', gradient: 'from-violet-500/12 to-purple-600/4',  border: 'border-violet-400/22', icon: <Scroll size={13} />   },
  'Quick Facts':  { color: '#9BC38B', gradient: 'from-green-500/12 to-emerald-600/4',  border: 'border-green-400/22',  icon: <Zap size={13} />      },
  "Kid's Mode":   { color: '#C3BB8B', gradient: 'from-yellow-500/12 to-orange-600/4',  border: 'border-yellow-400/22', icon: <Star size={13} />     },
};

// Full BCP-47 tags for browser Speech Synthesis
const TTS_LANG_CODES: Record<Language, string> = {
  English:   'en-IN',
  Hindi:     'hi-IN',
  Telugu:    'te-IN',
  Tamil:     'ta-IN',
  Bengali:   'bn-IN',
  Kannada:   'kn-IN',
  Gujarati:  'gu-IN',
  Marathi:   'mr-IN',
  Malayalam: 'ml-IN',
  French:    'fr-FR',
  German:    'de-DE',
  Spanish:   'es-ES',
  Japanese:  'ja-JP',
  Chinese:   'zh-CN',
  Arabic:    'ar-SA',
};

const FALLBACK_LIBRARY: LibraryEntry[] = [
  { id: 'hampi',        place: 'Hampi, Karnataka',          title: 'Hampi — The Fallen Empire',           duration: '4:32', preview: 'In 1336, two brothers stood on the banks of the Tungabhadra River…' },
  { id: 'lepakshi',     place: 'Lepakshi, Andhra Pradesh',  title: 'Lepakshi — Where Gravity Surrenders', duration: '3:18', preview: 'There is a pillar in a 16th-century temple that has been confounding engineers for 500 years…' },
  { id: 'taj',          place: 'Agra, Uttar Pradesh',       title: 'Taj Mahal — A Grief Made Eternal',    duration: '5:44', preview: 'She died at 39, giving birth to their fourteenth child…' },
  { id: 'konark',       place: 'Puri District, Odisha',     title: 'Konark — Temple of the Sun God',      duration: '4:10', preview: 'A temple designed as a colossal chariot of the Sun God — 24 intricately carved wheels…' },
  { id: 'varanasi',     place: 'Varanasi, Uttar Pradesh',   title: 'Varanasi — Where Time Stands Still',  duration: '5:10', preview: 'The oldest continuously inhabited city on earth…' },
  { id: 'brihadisvara', place: 'Thanjavur, Tamil Nadu',     title: 'Brihadisvara — The Living Temple',    duration: '3:55', preview: 'The shadow of the vimana tower never falls on the ground at noon…' },
];


// ── Place name detection from spoken/typed text ──────────────────
const PLACE_KEYWORDS: Array<{ keywords: string[]; entry: LibraryEntry }> = [];
// populated after FALLBACK_LIBRARY is defined (see useEffect below)

function detectPlaceFromText(text: string, library: LibraryEntry[]): LibraryEntry | null {
  const lower = text.toLowerCase();
  for (const entry of library) {
    // Check place name words and title keywords
    const placeParts = entry.place.toLowerCase().split(/[,\s]+/);
    const titleParts = entry.title.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    const keywords = [...new Set([...placeParts, ...titleParts])].filter(k => k.length > 3);
    if (keywords.some(k => lower.includes(k))) return entry;
  }
  return null;
}

export default function VoicePage() {
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [mode,        setMode]        = useState<StoryMode>('Guide Mode');
  const [language,    setLanguage]    = useState<Language>('English');
  const [progress,    setProgress]    = useState(0);
  const [transcript,  setTranscript]  = useState('');
  const [narration,   setNarration]   = useState('');
  const [error,       setError]       = useState('');
  const [library,     setLibrary]     = useState<LibraryEntry[]>(FALLBACK_LIBRARY);
  const [activeEntry, setActiveEntry] = useState<LibraryEntry | null>(null);
  const [hasMic,      setHasMic]      = useState(true);
  const [typedText,   setTypedText]   = useState('');
  // countdown shown before mic opens so user knows when to speak
  const [micCountdown, setMicCountdown] = useState(0);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const speakingRef  = useRef(false);

  const meta = MODE_META[mode] || MODE_META['Guide Mode'];

  // ── Stop all audio properly ───────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      const a = audioRef.current;
      audioRef.current = null;
      a.onplay = null; a.onpause = null; a.onended = null;
      a.onerror = null; a.ontimeupdate = null;
      a.pause();
      a.src = '';
      try { a.load(); } catch {}
    }
    speakingRef.current = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    stopAllAudio();
    setVoiceState(prev =>
      prev === 'playing' || prev === 'recording' || prev === 'processing' ? 'idle' : prev
    );
    setNarration(''); setTranscript(''); setActiveEntry(null); setProgress(0);
  }, [language, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiService.getNarrationLibrary()
      .then((d: any) => { if (d?.featured?.length) setLibrary(d.featured); })
      .catch(() => {});
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(s => { s.getTracks().forEach(t => t.stop()); setHasMic(true); })
      .catch(() => setHasMic(false));
    return () => { stopAllAudio(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Browser TTS fallback with correct BCP-47 lang codes ──────────
  const browserSpeak = useCallback((text: string, lang: Language) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    speakingRef.current = true;

    const bcp47  = TTS_LANG_CODES[lang] || 'en-IN';
    const chunks = text.match(/.{1,200}(?:\s|$)/g) || [text];
    const total  = chunks.length;
    let   idx    = 0;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find(v => v.lang.toLowerCase() === bcp47.toLowerCase()) ||
        voices.find(v => v.lang.toLowerCase().startsWith(bcp47.split('-')[0]) && !v.lang.startsWith('en')) ||
        voices.find(v => v.lang.toLowerCase().startsWith(bcp47.split('-')[0])) ||
        voices[0]
      );
    };

    const speakNext = () => {
      if (!speakingRef.current) return;
      if (idx >= total) {
        speakingRef.current = false;
        setIsPlaying(false); setProgress(100); setVoiceState('idle');
        return;
      }
      const utt = new SpeechSynthesisUtterance(chunks[idx++]);
      utt.lang  = bcp47;
      utt.rate  = 0.88;
      const v   = pickVoice();
      if (v) utt.voice = v;
      utt.onend   = () => { setProgress(Math.round((idx / total) * 100)); speakNext(); };
      utt.onerror = () => { if (speakingRef.current) speakNext(); };
      window.speechSynthesis.speak(utt);
    };

    setIsPlaying(true);
    if (window.speechSynthesis.getVoices().length > 0) {
      speakNext();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNext();
      };
    }
  }, []);

  // ── Pending audio to play on next user tap (autoplay unlock) ─────
  const pendingAudioRef = useRef<{ text: string; lang: Language; audioUrl?: string | null } | null>(null);

  // ── Play backend MP3, fall back to browser TTS ───────────────────
  const playAudio = useCallback(async (text: string, lang: Language, audioUrl?: string | null) => {
    stopAllAudio();

    const tryPlay = async (): Promise<boolean> => {
      if (!audioUrl) return false;
      const origin  = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
        : '';
      const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${origin}${audioUrl}`;

      return new Promise<boolean>((resolve) => {
        const audio = new Audio(fullUrl);
        audioRef.current = audio;
        audio.crossOrigin = 'anonymous';

        audio.onplay       = () => { if (audioRef.current === audio) setIsPlaying(true); };
        audio.onpause      = () => { if (audioRef.current === audio) setIsPlaying(false); };
        audio.onended      = () => {
          if (audioRef.current !== audio) return;
          audioRef.current = null;
          setIsPlaying(false); setProgress(100); setVoiceState('idle');
        };
        audio.onerror      = () => {
          if (audioRef.current !== audio) return;
          audioRef.current = null;
          resolve(false);
        };
        audio.ontimeupdate = () => {
          if (audioRef.current !== audio || !audio.duration) return;
          setProgress(Math.round((audio.currentTime / audio.duration) * 100));
        };

        audio.play().then(() => resolve(true)).catch(() => {
          audioRef.current = null;
          resolve(false);
        });
      });
    };

    const played = await tryPlay();
    if (!played) {
      // Autoplay blocked or no audioUrl — try browser TTS
      // browserSpeak also needs user gesture; if it fails, store pending and
      // show "tap mic to play" UI so next tap triggers audio.
      try {
        browserSpeak(text, lang);
      } catch {
        // Store for replay on next mic tap
        pendingAudioRef.current = { text, lang, audioUrl };
        setVoiceState('playing'); // keep playing state so mic shows Play icon
        setIsPlaying(false);      // show Play (not Pause) so user knows to tap
      }
    }
  }, [stopAllAudio, browserSpeak]);

  // ── Generate narration + play ─────────────────────────────────────
  const generateAndSpeak = useCallback(async (
    query: string, lang: Language, place?: string, entryForLib?: LibraryEntry,
  ) => {
    setVoiceState('processing');
    setError(''); setNarration(''); setProgress(0);
    try {
      const result   = await apiService.generateNarration(query, mode, lang, place);
      const text     = result.transcript || result.text || '';
      const audioUrl = result.audio_url;
      if (!text) { setError('AI returned empty response. Please try again.'); setVoiceState('error'); return; }
      setNarration(text);
      if (entryForLib) setActiveEntry(entryForLib);
      setVoiceState('playing');
      await playAudio(text, lang, audioUrl);
    } catch (err: any) {
      setError(err.message?.includes('fetch')
        ? 'Backend not running. Start it with: bash run_local.sh'
        : err.message || 'Failed to generate narration.');
      setVoiceState('error');
    }
  }, [mode, playAudio]);

  // ── Mic button — with 2s delay before recording opens ────────────
  const handleMicButton = useCallback(() => {
    if (voiceState === 'recording') {
      recorderRef.current?.stop();
      return;
    }
    if (voiceState === 'playing') {
      if (isPlaying) {
        stopAllAudio();
      } else {
        // If there's pending audio from an autoplay-blocked attempt, retry it
        const pending = pendingAudioRef.current;
        if (pending) {
          pendingAudioRef.current = null;
          playAudio(pending.text, pending.lang, pending.audioUrl);
        } else if (narration) {
          playAudio(narration, language);
        }
      }
      return;
    }
    if (voiceState !== 'idle' && voiceState !== 'error') return;
    if (!hasMic) return;

    // Stop any audio still playing, then wait 2 seconds before opening mic.
    // This prevents the mic from picking up the tail-end of the last narration.
    stopAllAudio();
    setError(''); setTranscript(''); setNarration('');
    setActiveEntry(null); setProgress(0);

    const recordingLang = language;

    // Show 2-second countdown, then open mic
    setMicCountdown(2);
    const t1 = setTimeout(() => setMicCountdown(1), 1000);
    const t2 = setTimeout(() => {
      setMicCountdown(0);
      setVoiceState('recording');

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const mimeType =
            MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
            MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' : 'audio/ogg';

          const recorder = new MediaRecorder(stream, { mimeType });
          chunksRef.current = [];

          recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

          recorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            setVoiceState('processing');

            const blob     = new Blob(chunksRef.current, { type: mimeType });
            const langCode = WHISPER_LANG_CODES[recordingLang] || 'en';

            try {
              const tx  = await apiService.transcribeAudio(blob, langCode);

              if (tx.offline) {
                setError('Whisper not installed. Use the text box below.');
                setVoiceState('error'); return;
              }

              const raw = (tx.transcript || '').trim();

              // Detect mic echo — very short or only punctuation/common TTS noise
              const isNoise = !raw || raw.length < 4 ||
                /^[\s.,!?…\-–—"']+$/.test(raw) ||
                /^(thank you|okay|yes|no|hmm|uh|um|oh|ah)\.?$/i.test(raw);

              if (isNoise) {
                setError(raw
                  ? `Heard "${raw}" — this looks like speaker echo. Please use headphones, or wait for narration to finish before speaking.`
                  : 'Could not hear clearly. Please speak louder or closer to the mic.');
                setVoiceState('error'); return;
              }

              setTranscript(raw);
              // Auto-detect place name from transcript for better narration
              const detectedEntry = detectPlaceFromText(raw, library);
              await generateAndSpeak(
                raw, recordingLang,
                detectedEntry?.place,
                detectedEntry || undefined
              );
            } catch (err: any) {
              setError(err.message?.includes('fetch') ? 'Backend not running.' : err.message || 'Transcription failed.');
              setVoiceState('error');
            }
          };

          recorder.start();
          recorderRef.current = recorder;
          setTimeout(() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }, 30000);
        })
        .catch(() => {
          setHasMic(false);
          setError('Microphone access denied. Use the text box below.');
          setVoiceState('error');
        });
    }, 2000);

    // If component unmounts during countdown, clear timers
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [voiceState, isPlaying, narration, hasMic, language, stopAllAudio, playAudio, generateAndSpeak]);

  const handleTypedSubmit = useCallback(async () => {
    const q = typedText.trim();
    if (!q || voiceState === 'processing') return;
    const lang = language;
    stopAllAudio();
    setTranscript(q); setTypedText(''); setActiveEntry(null);
    await generateAndSpeak(q, lang);
  }, [typedText, voiceState, language, stopAllAudio, generateAndSpeak]);

  const playLibraryEntry = useCallback(async (entry: LibraryEntry) => {
    if (activeEntry?.id === entry.id && voiceState === 'playing') {
      isPlaying ? stopAllAudio() : narration && await playAudio(narration, language);
      return;
    }
    const lang = language;
    stopAllAudio(); setTranscript(''); setActiveEntry(entry);
    await generateAndSpeak(`Tell me about: ${entry.title}`, lang, entry.place, entry);
  }, [activeEntry, voiceState, isPlaying, narration, language, stopAllAudio, playAudio, generateAndSpeak]);

  const regenCurrentContent = useCallback(async () => {
    const query = transcript || (activeEntry ? `Tell me about: ${activeEntry.title}` : '');
    if (!query) return;
    const lang = language;
    stopAllAudio();
    await generateAndSpeak(query, lang, activeEntry?.place, activeEntry || undefined);
  }, [transcript, activeEntry, language, stopAllAudio, generateAndSpeak]);

  const reset = useCallback(() => {
    stopAllAudio();
    try { recorderRef.current?.stop(); } catch {}
    setVoiceState('idle'); setProgress(0); setTranscript('');
    setNarration(''); setError(''); setActiveEntry(null); setMicCountdown(0);
  }, [stopAllAudio]);

  const micIcon = () => {
    if (micCountdown > 0)                               return <span className="text-white font-bold text-2xl">{micCountdown}</span>;
    if (voiceState === 'processing')                    return <Loader size={28} className="animate-spin text-white" />;
    if (voiceState === 'recording')                     return <Square size={28} className="text-white" />;
    if (voiceState === 'playing' && isPlaying)          return <Pause size={28} className="text-black" />;
    if (voiceState === 'playing' && !isPlaying)         return <Play size={28} className="text-black" />;
    if (!hasMic)                                        return <MicOff size={28} className="text-white/40" />;
    return                                                     <Mic size={28} className="text-white" />;
  };

  const micBg = () => {
    if (micCountdown > 0)            return 'bg-orange-500 cursor-wait';
    if (voiceState === 'recording')  return 'bg-red-500';
    if (voiceState === 'processing') return 'bg-white/10 cursor-wait';
    if (voiceState === 'playing')    return 'bg-gold/90';
    return                                  'bg-white/12 hover:bg-white/20';
  };

  const micLabel = () => {
    if (micCountdown > 0)            return `Mic opens in ${micCountdown}s — get ready to speak…`;
    if (voiceState === 'idle')       return hasMic ? `Tap mic · speak in ${language}` : 'Type your question below';
    if (voiceState === 'recording')  return `Listening in ${language}… tap to stop`;
    if (voiceState === 'processing') return `Generating ${mode} in ${language}…`;
    if (voiceState === 'playing')    return isPlaying ? `Playing in ${language}` : `Tap mic to play · or type a new question`;
    if (voiceState === 'error')      return 'Tap mic to try again';
    return '';
  };

  return (
    <PageWrapper>
      <PageHero
        label="Audio Storytelling"
        title={<>Voice <em className="not-italic gold-gradient">Narrator</em></>}
        sub="Speak or type — AI narrates India's heritage in your language and mode"
        video="/videos/beach.mp4"
        theme="ocean"
      />
      <div className="min-h-screen px-4 pb-24 pt-6 max-w-2xl mx-auto">

        <div className="mb-3"><ModePills value={mode} onChange={setMode} /></div>
        <div className="mb-5"><LanguagePicker value={language} onChange={setLanguage} /></div>

        <AnimatePresence mode="wait">
          <motion.div key={mode}
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className={`mb-6 px-4 py-2.5 rounded-2xl bg-gradient-to-r border flex items-center gap-2 ${meta.gradient} ${meta.border}`}
          >
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span className="text-xs font-semibold" style={{ color: meta.color }}>{mode}</span>
            <span className="text-white/25 text-xs">·</span>
            <span className="text-white/40 text-xs">{language}</span>
            {isPlaying && (
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: meta.color }} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mic button */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            {voiceState === 'recording' && (
              <motion.div className="absolute inset-0 rounded-full bg-red-500/20"
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }} />
            )}
            {micCountdown > 0 && (
              <motion.div className="absolute inset-0 rounded-full bg-orange-500/20"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 1 }} />
            )}
            <motion.button
              onClick={handleMicButton}
              disabled={voiceState === 'processing' || micCountdown > 0 || (!hasMic && voiceState === 'idle')}
              whileTap={{ scale: 0.93 }}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${micBg()}`}
            >
              {micIcon()}
            </motion.button>
          </div>
          <p className="text-white/45 text-xs text-center leading-relaxed">{micLabel()}</p>
        </div>

        {voiceState === 'recording' && (
          <div className="flex items-center justify-center gap-0.5 h-10 mb-5">
            {Array.from({ length: 28 }, (_, i) => (
              <motion.div key={i} animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 0.5 + (i % 6) * 0.07, delay: i * 0.025 }}
                className="w-1 rounded-full bg-red-400" style={{ height: 24, transformOrigin: 'bottom' }} />
            ))}
          </div>
        )}

        {voiceState === 'playing' && progress > 0 && progress < 100 && (
          <div className="w-full h-0.5 bg-white/10 rounded-full mb-5 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: meta.color }}
              animate={{ width: `${progress}%` }} transition={{ ease: 'linear' }} />
          </div>
        )}

        {transcript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 px-3 py-2 glass rounded-xl">
            <p className="text-white/30 text-[10px] mb-0.5">You said ({language}):</p>
            <p className="text-white/60 text-xs italic">"{transcript}"</p>
          </motion.div>
        )}

        <AnimatePresence>
          {narration && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mb-5 p-4 rounded-2xl bg-gradient-to-br border ${meta.gradient} ${meta.border}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Volume2 size={13} style={{ color: meta.color }} />
                <span className="text-xs font-medium" style={{ color: meta.color }}>{mode} · {language}</span>
                {activeEntry && <>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/30 text-xs truncate">{activeEntry.title.split('—')[0].trim()}</span>
                </>}
                {isPlaying && (
                  <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                    className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: meta.color }} />
                )}
              </div>
              <p className="text-white/75 text-sm leading-relaxed whitespace-pre-line">{narration}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => isPlaying ? stopAllAudio() : playAudio(narration, language)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-white/60 text-xs transition-all">
                  {isPlaying ? <Pause size={11} /> : <Play size={11} />}
                  {isPlaying ? 'Pause' : 'Replay'}
                </button>
                {(transcript || activeEntry) && (
                  <button onClick={regenCurrentContent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-xs transition-all"
                    style={{ color: meta.color }}>
                    <RefreshCw size={11} /> {mode}
                  </button>
                )}
                <button onClick={reset}
                  className="px-3 py-1.5 rounded-lg glass hover:bg-white/10 text-white/30 text-xs transition-all">
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-5 p-3 rounded-xl bg-red-500/8 border border-red-500/18 flex gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300/80 text-xs leading-relaxed">{error}</p>
          </motion.div>
        )}

        {/* Text input — always available */}
        <div className="mb-7 p-4 glass rounded-2xl">
          <p className="text-white/30 text-[10px] mb-2">Or type your question ({language}):</p>
          <div className="flex gap-2">
            <input value={typedText} onChange={e => setTypedText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTypedSubmit()}
              placeholder={`e.g. Tell me about Hampi in ${mode} style…`}
              className="flex-1 bg-white/6 rounded-lg px-3 py-2 text-white text-xs
                placeholder:text-white/18 outline-none border border-white/8 focus:border-gold/30 transition-all" />
            <button onClick={handleTypedSubmit}
              disabled={!typedText.trim() || voiceState === 'processing'}
              className="px-4 py-2 rounded-lg text-black text-xs font-medium disabled:opacity-40 transition-all"
              style={{ background: meta.color }}>
              Ask
            </button>
          </div>
        </div>

        {/* Story library */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/25 text-[10px] uppercase tracking-widest">Story Library</p>
            <p className="text-white/18 text-[10px]">Plays in {mode} · {language}</p>
          </div>
          <div className="space-y-2">
            {library.map(entry => {
              const isActive   = activeEntry?.id === entry.id;
              const isThisPlay = isActive && voiceState === 'playing';
              return (
                <motion.button key={entry.id} onClick={() => playLibraryEntry(entry)} whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive ? `bg-gradient-to-br ${meta.gradient} ${meta.border}` : 'bg-white/4 border-white/8 hover:bg-white/7 hover:border-white/14'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/80 text-sm font-medium truncate pr-2">{entry.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-white/25 text-[10px]">{entry.duration}</span>
                      {voiceState === 'processing' && isActive
                        ? <Loader size={12} className="animate-spin" style={{ color: meta.color }} />
                        : isThisPlay && isPlaying
                        ? <Pause size={12} style={{ color: meta.color }} />
                        : <Play size={12} className={isActive ? '' : 'text-white/25'} style={isActive ? { color: meta.color } : {}} />
                      }
                    </div>
                  </div>
                  <p className="text-white/30 text-[10px] mb-1">{entry.place}</p>
                  <p className="text-white/35 text-xs line-clamp-2 leading-relaxed">{entry.preview}</p>
                  {isActive && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full border"
                        style={{ color: meta.color, borderColor: `${meta.color}35`, background: `${meta.color}10` }}>
                        {mode}
                      </span>
                      <span className="text-[9px]" style={{ color: meta.color }}>· {language}</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          <p className="text-center text-white/12 text-[10px] mt-4">
            Tap any entry to hear it in your current mode and language
          </p>
        </div>

        <p className="text-center text-white/10 text-[9px] mt-6">
          Groq · Llama 3.3 · edge-tts · 15 languages · 6 modes
        </p>
      </div>
    </PageWrapper>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, BookOpen, Volume2, VolumeX, Square, RotateCcw, Sparkles, AlertCircle, Check } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { ModePills } from '../components/ui/ModePills';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { apiService } from '../services/api';
import { STORY_MODES, MODE_DESCRIPTIONS, type StoryMode, type Language } from '../types';
import { toApiHistory } from '../utils/format';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  mode?: StoryMode;
  language?: Language;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

const SUGGESTIONS_BY_LANGUAGE: Partial<Record<Language, string[]>> = {
  English: [
    'Tell me about Hampi as if you are my guide walking with me',
    'What are the hidden secrets of the Taj Mahal?',
    'Explain Khajuraho temples — architecture and mythology',
    'Best hidden waterfalls in Andhra Pradesh',
    'Plan a 3-day trip to Rajasthan forts',
    'What is special about Lepakshi temple?',
    'Tell me about Penchalakona waterfall temple',
  ],
  Hindi: [
    'हम्पी के बारे में बताएं जैसे आप मेरे साथ चल रहे हों',
    'ताज महल के छुपे हुए राज क्या हैं?',
    'राजस्थान के किले कैसे घूमें?',
    'भारत के सबसे अनजान मंदिर कौन से हैं?',
  ],
  Telugu: [
    'హంపి గురించి గైడ్ లా చెప్పండి',
    'తాజ్ మహల్ రహస్యాలు ఏమిటి?',
    'లేపాక్షి ఆలయం ప్రత్యేకత ఏమిటి?',
    'ఆంధ్రప్రదేశ్ లోని దాచిన రత్నాలు',
  ],
  Tamil: [
    'பிரஹதீஸ்வர கோயில் கதை சொல்லுங்கள்',
    'தமிழ்நாட்டின் மறைந்த இடங்கள் என்ன?',
    'காஞ்சிபுரம் சுற்றுலா திட்டம்',
  ],
  French: [
    'Parlez-moi de Hampi comme si vous étiez mon guide',
    'Quels sont les secrets cachés du Taj Mahal?',
    'Planifiez un voyage de 3 jours au Rajasthan',
  ],
  German: [
    'Erzählen Sie mir von Hampi als wären Sie mein Reiseführer',
    'Was sind die versteckten Geheimnisse des Taj Mahal?',
  ],
  Spanish: [
    'Cuéntame sobre Hampi como si fueras mi guía',
    'Planifica un viaje de 3 días a Rajastán',
  ],
};

function getWelcome(language: Language): string {
  const welcomes: Partial<Record<Language, string>> = {
    English: `Namaste! I'm Vihara — your personal AI guide for India's heritage.

I work best in **Guide Mode** — I'll walk alongside you, point out what to notice, share insider secrets, and tell you things your textbook never will.

Ask me about any monument, temple, or hidden gem. Or just say "I'm at the Taj Mahal, what should I look at first?"`,

    Hindi: `नमस्ते! मैं विहारा हूँ — भारत की धरोहर का आपका personal AI गाइड।

मैं **Guide Mode** में सबसे अच्छा काम करता हूँ — आपके साथ चलूँगा, बताऊँगा क्या देखना है, और वो राज़ शेयर करूँगा जो tour guides भी नहीं बताते।

कोई भी मंदिर, स्मारक, या छुपी जगह के बारे में पूछें।`,

    Telugu: `నమస్కారం! నేను విహార — భారత వారసత్వానికి మీ personal AI గైడ్.

నేను **Guide Mode** లో అత్యుత్తమంగా పని చేస్తాను — మీతో పాటు నడుస్తూ, ఏమి చూడాలో చెప్తూ, రహస్యాలు పంచుకుంటాను.

ఏ ఆలయం, స్మారకం లేదా దాచిన ప్రదేశం గురించైనా అడగండి.`,

    Tamil: `வணக்கம்! நான் விஹார — இந்திய பாரம்பரியத்திற்கான உங்கள் personal AI வழிகாட்டி.

**Guide Mode** இல் நான் சிறப்பாக செயல்படுவேன் — உங்களுடன் நடந்து, என்ன பார்க்கணும்னு சொல்லி, ரகசியங்களை பகிர்வேன்.`,

    French: `Bonjour! Je suis Vihara — votre guide IA personnel pour le patrimoine indien.

Je fonctionne mieux en **Mode Guide** — je marche avec vous, vous montre quoi remarquer, et partage des secrets d'initiés.`,

    German: `Guten Tag! Ich bin Vihara — Ihr persönlicher KI-Reiseführer für Indiens Kulturerbe.

Ich arbeite am besten im **Führermodus** — ich begleite Sie, zeige Ihnen, worauf Sie achten sollen.`,

    Spanish: `¡Hola! Soy Vihara — tu guía IA personal para el patrimonio de India.

Funciono mejor en **Modo Guía** — camino contigo, te muestro qué notar, comparto secretos de locales.`,
  };
  return welcomes[language] || welcomes['English']!;
}

export default function ChatPage() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [mode,      setMode]      = useState<StoryMode>('Guide Mode');
  const [language,  setLanguage]  = useState<Language>('English');
  const [streaming, setStreaming] = useState(false);
  const endRef      = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef(false);

  // ── Listen (TTS) state ──────────────────────────────────────────
  const [speakingId,  setSpeakingId]  = useState<string | null>(null);
  const [savedIds,    setSavedIds]    = useState<Set<string>>(new Set());
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const utterRef    = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop any ongoing TTS when component unmounts or chat is cleared
  useEffect(() => {
    return () => {
      ttsAudioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stopSpeaking = () => {
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  };

  const speakMessage = async (msg: ChatMessage) => {
    // If already speaking this message, stop it
    if (speakingId === msg.id) { stopSpeaking(); return; }

    stopSpeaking(); // stop any previous

    setSpeakingId(msg.id);

    // Strip markdown for cleaner TTS
    const cleanText = msg.content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    // Try backend TTS first (higher quality)
    try {
      const res = await fetch('/api/v1/voice/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.slice(0, 2000), // cap length
          mode: msg.mode || 'Guide Mode',
          language: msg.language || 'English',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_url) {
          const audio = new Audio(data.audio_url);
          ttsAudioRef.current = audio;
          audio.onended = () => { setSpeakingId(null); ttsAudioRef.current = null; };
          audio.onerror = () => { ttsAudioRef.current = null; browserSpeak(cleanText, msg.language || 'English', msg.id); };
          await audio.play();
          return;
        }
      }
    } catch { /* fall through to browser TTS */ }

    // Browser TTS fallback
    browserSpeak(cleanText, msg.language || 'English', msg.id);
  };

  const browserSpeak = (text: string, language: Language, msgId: string) => {
    if (!window.speechSynthesis) { setSpeakingId(null); return; }
    window.speechSynthesis.cancel();

    const LANG_CODES: Record<string, string> = {
      English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN', Tamil: 'ta-IN',
      Bengali: 'bn-IN', Kannada: 'kn-IN', Gujarati: 'gu-IN', Marathi: 'mr-IN',
      Malayalam: 'ml-IN', French: 'fr-FR', German: 'de-DE', Spanish: 'es-ES',
      Japanese: 'ja-JP', Chinese: 'zh-CN', Arabic: 'ar-SA',
    };
    const langCode = LANG_CODES[language] || 'en-IN';

    // Split into chunks so long responses don't silently fail
    const chunks = text.match(/[^.!?]{1,250}[.!?]?/g) || [text];
    let idx = 0;

    const speakNext = () => {
      if (idx >= chunks.length) { setSpeakingId(null); return; }
      const utt = new SpeechSynthesisUtterance(chunks[idx++]);
      utt.lang  = langCode;
      utt.rate  = 0.88;
      utt.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const match  = voices.find(v => v.lang.startsWith(langCode.split('-')[0])) || voices[0];
      if (match) utt.voice = match;
      utt.onend  = speakNext;
      utt.onerror = () => setSpeakingId(null);
      utterRef.current = utt;
      window.speechSynthesis.speak(utt);
    };

    // Chrome requires a tiny delay after cancel
    setTimeout(speakNext, 100);
  };

  const saveMessage = (msg: ChatMessage) => {
    const saved = JSON.parse(localStorage.getItem('vihara_saved_responses') || '[]');
    saved.push({
      id: msg.id,
      content: msg.content,
      mode: msg.mode,
      language: msg.language,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem('vihara_saved_responses', JSON.stringify(saved.slice(-50)));
    setSavedIds(prev => new Set([...prev, msg.id]));
    // Reset saved tick after 2s
    setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(msg.id); return n; }), 2000);
  };
  const location  = useLocation();
  const didAutoSend = useRef(false);

  // Set welcome message when language changes
  useEffect(() => {
    setMessages([{
      id: '0', role: 'ai',
      content: getWelcome(language),
      mode: 'Guide Mode', language,
      timestamp: new Date(),
    }]);
  }, [language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    setInput('');
    abortRef.current = false;

    const uid  = Date.now().toString();
    const aiId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: uid,  role: 'user', content, mode, language, timestamp: new Date() },
      { id: aiId, role: 'ai',   content: '', mode, language, timestamp: new Date(), isStreaming: true },
    ]);
    setStreaming(true);

    const history = toApiHistory(messages).slice(-12);

    try {
      let full = '';
      for await (const chunk of apiService.streamChat(content, mode, language, history)) {
        if (abortRef.current) break;
        full += chunk;
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full } : m));
      }
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, isStreaming: false } : m));
    } catch (err: any) {
      const isNetworkErr = err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      const msg = isNetworkErr
        ? 'Connection issue — backend may be starting up. Please try again in a moment.'
        : err.message?.includes('429')
        ? 'Too many requests — please wait a moment and try again.'
        : err.message?.includes('503') || err.message?.includes('502')
        ? 'The AI service is temporarily unavailable. Retrying…'
        : err.message || 'Something went wrong — please try again.';
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: msg, isStreaming: false, isError: true } : m
      ));
    } finally {
      setStreaming(false);
    }
  }, [input, messages, mode, language, streaming]);

  // Store send in a ref so the auto-send effect below doesn't re-fire on every render
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  // Auto-send initial message from navigation state (e.g. "Ask AI Guide" in GemsPage)
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage;
    if (initialMessage && !didAutoSend.current) {
      didAutoSend.current = true;
      const timer = setTimeout(() => sendRef.current(initialMessage), 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    abortRef.current = true;
    setStreaming(false);
    stopSpeaking();
    setSavedIds(new Set());
    setMessages([{
      id: '0', role: 'ai',
      content: getWelcome(language),
      mode: 'Guide Mode', language,
      timestamp: new Date(),
    }]);
  };

  const currentSuggestions = SUGGESTIONS_BY_LANGUAGE[language] || SUGGESTIONS_BY_LANGUAGE['English']!;

  return (
    <PageWrapper>
      {/* Ambient cinematic backdrop for chat — subtle, not a hero */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.04 }}
          ref={el => { if (el) el.play().catch(() => setTimeout(() => el.play().catch(() => {}), 400)); }}
          onLoadedData={e => { const v = e.target as HTMLVideoElement; v.play().catch(() => {}); }}
          onCanPlay={e => { const v = e.target as HTMLVideoElement; v.play().catch(() => {}); }}
          onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        >
          <source src="/videos/city.mp4" type="video/mp4" />
        </video>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 0% 0%, rgba(201,169,110,0.07) 0%, transparent 55%)' }} />
      </div>
      <div className="flex h-[100svh] pt-[62px]" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <motion.aside
          initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="hidden lg:flex w-64 xl:w-72 flex-col border-r border-white/[0.055] p-4 gap-4 overflow-y-auto shrink-0"
        >
          {/* Mode */}
          <div className="glass p-4">
            <p className="label-text mb-3">Narration Mode</p>
            <div className="space-y-1">
              {STORY_MODES.map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[12.5px] transition-all ${
                    mode === m
                      ? 'bg-gold/10 border border-gold/22 text-gold-light'
                      : 'text-white/38 hover:text-white/65 hover:bg-white/[0.04]'
                  }`}
                >
                  {m === 'Guide Mode' ? '🧭 ' : ''}{m}
                  {mode === m && (
                    <span className="block text-[10px] text-white/30 mt-0.5 font-normal">
                      {MODE_DESCRIPTIONS[m]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="glass p-4">
            <p className="label-text mb-3">Language</p>
            <LanguagePicker value={language} onChange={setLanguage} />
          </div>

          {/* Suggestions */}
          <div>
            <p className="label-text mb-2 px-1">Try Asking</p>
            <div className="space-y-1.5">
              {currentSuggestions.slice(0, 5).map((s, i) => (
                <motion.button key={i} onClick={() => send(s)} disabled={streaming}
                  className="w-full text-left px-3 py-2.5 glass rounded-xl text-[11.5px] text-white/32 hover:text-white/62 transition-all leading-relaxed disabled:opacity-40"
                  whileHover={{ x: 2 }}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.aside>

        {/* ── Chat area ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="h-[52px] border-b border-white/[0.055] flex items-center justify-between px-4 md:px-5 glass-dark shrink-0">
            <div className="flex items-center gap-2.5">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-gold"
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 2.2 }} />
              <span className="text-[13px] text-white/45">
                <span className="text-gold font-medium">Vihara</span>
                <span className="hidden sm:inline"> · {mode}</span>
                {language !== 'English' && (
                  <span className="hidden sm:inline text-gold/70"> · {language}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile pickers */}
              <div className="flex gap-2 lg:hidden">
                <ModePills value={mode} onChange={setMode} className="flex-nowrap overflow-x-auto" />
                <LanguagePicker value={language} onChange={setLanguage} compact />
              </div>
              <button onClick={clearChat} className="btn-glass p-2 rounded-lg" title="Clear chat">
                <RotateCcw size={12} className="text-white/30" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-2.5 max-w-2xl ${msg.role === 'user' ? 'justify-end ml-auto' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full glass-gold flex items-center justify-center shrink-0 mt-1">
                      <span className="text-gold text-xs font-display">V</span>
                    </div>
                  )}
                  <div className={`${msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'} px-4 py-3 max-w-lg`}>
                    {msg.isError && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertCircle size={11} className="text-red-400/60" />
                        <span className="text-[10.5px] text-red-400/60">Error</span>
                      </div>
                    )}
                    {msg.role === 'ai' && msg.mode && !msg.isError && (
                      <p className="label-text mb-1.5" style={{ fontSize: '9px' }}>
                        {msg.mode === 'Guide Mode' ? '🧭 ' : ''}{msg.mode}
                        {msg.language && msg.language !== 'English' && ` · ${msg.language}`}
                      </p>
                    )}
                    <p className={`text-sm leading-relaxed whitespace-pre-line ${
                      msg.isError ? 'text-red-400/65' : 'text-white/75'
                    }`}>
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-0.5 h-[14px] bg-gold ml-0.5 align-middle animate-pulse" />
                      )}
                    </p>
                    {msg.role === 'ai' && !msg.isStreaming && msg.content && !msg.isError && (
                      <div className="flex gap-3 mt-2.5 pt-2.5 border-t border-white/[0.055]">
                        <button
                          onClick={() => speakMessage(msg)}
                          className={`flex items-center gap-1 text-[11px] transition-colors ${
                            speakingId === msg.id
                              ? 'text-gold animate-pulse'
                              : 'text-white/22 hover:text-gold'
                          }`}
                          title={speakingId === msg.id ? 'Tap to stop' : 'Listen aloud'}
                        >
                          {speakingId === msg.id
                            ? <><Square size={10} fill="currentColor" /> Stop</>
                            : <><Volume2 size={10} /> Listen</>
                          }
                        </button>
                        <button
                          onClick={() => saveMessage(msg)}
                          className={`flex items-center gap-1 text-[11px] transition-colors ${
                            savedIds.has(msg.id)
                              ? 'text-gold'
                              : 'text-white/22 hover:text-gold'
                          }`}
                          title="Save this response"
                        >
                          {savedIds.has(msg.id)
                            ? <><Check size={10} /> Saved</>
                            : <><BookOpen size={10} /> Save</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.055] p-3 md:px-5 shrink-0">
            <div className="flex items-end gap-2 max-w-2xl mx-auto">
              <div className="flex-1 glass rounded-2xl overflow-hidden">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={streaming}
                  placeholder={language === 'Hindi' ? 'यहाँ कुछ पूछें...' :
                               language === 'Telugu' ? 'ఇక్కడ అడగండి...' :
                               language === 'Tamil' ? 'இங்கே கேளுங்கள்...' :
                               'Ask about any monument, place, or experience…'}
                  rows={1}
                  className="w-full bg-transparent px-4 py-3 text-sm text-white/72 placeholder-white/18 outline-none leading-relaxed resize-none"
                  style={{ maxHeight: 120 }}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <motion.button onClick={() => send()}
                disabled={!input.trim() || streaming}
                className={`p-3 rounded-xl shrink-0 transition-all ${
                  input.trim() && !streaming ? 'btn-gold' : 'glass opacity-35 cursor-not-allowed'
                }`}
                whileHover={input.trim() && !streaming ? { scale: 1.07 } : {}}
                whileTap={input.trim()  && !streaming ? { scale: 0.93 } : {}}
              >
                {streaming
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Sparkles size={16} className="text-black" />
                    </motion.div>
                  : <Send size={16} className={input.trim() ? 'text-black' : 'text-white/32'} />
                }
              </motion.button>
            </div>
            <p className="text-center mt-2 text-[10.5px] text-white/12">
              Groq · Llama 3.3 · 15 languages · Guide Mode
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

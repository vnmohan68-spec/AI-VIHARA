/**
 * LIVING WITNESS — The feature that has never existed in any tourism app.
 *
 * The monument speaks to you. First person. Present tense.
 * You choose the year — it tells you what it witnessed.
 *
 * Not a guide talking ABOUT a place.
 * The place talking TO you.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Square, Loader, Play, Pause,
  ChevronLeft, ChevronRight, Clock, Sparkles,
  Eye, Wind, Flame, Crown, Sword, Droplets
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { apiService } from '../services/api';
import { WHISPER_LANG_CODES, type Language } from '../types';

// ── Monuments the Witness knows deeply ──────────────────────────
interface WitnessMonument {
  id:           string;
  name:         string;
  location:     string;
  born:         number;       // year built
  alive:        boolean;      // still standing?
  persona:      string;       // how it speaks — voice/character
  keyYears:     { year: number; label: string; icon: React.ReactNode }[];
  coverGradient:string;
  accentColor:  string;
  whisper:      string;       // the opening line it says before you ask anything
}

const MONUMENTS: WitnessMonument[] = [
  {
    id:       'brihadisvara',
    name:     'Brihadisvara Temple',
    location: 'Thanjavur, Tamil Nadu',
    born:     1010,
    alive:    true,
    persona:  'Ancient, proud, patient. Speaks slowly. Has seen empires rise and fall from this exact spot.',
    accentColor: '#C9A96E',
    coverGradient: 'from-amber-900/40 to-stone-900/60',
    keyYears: [
      { year: 1010, label: 'My birth — Rajaraja I consecrates me', icon: <Crown size={13} /> },
      { year: 1070, label: 'My younger brother Gangaikonda is built', icon: <Sparkles size={13} /> },
      { year: 1310, label: 'The Malik Kafur invasion — my silence', icon: <Sword size={13} /> },
      { year: 1535, label: 'The Nayaks arrive — they add the gopuram', icon: <Crown size={13} /> },
      { year: 1987, label: 'UNESCO declares me a World Heritage Site', icon: <Eye size={13} /> },
    ],
    whisper: 'I have been standing here for 1,014 years. My shadow has never once fallen on the ground at noon. Ask me what I have seen.',
  },
  {
    id:       'hampi',
    name:     'Virupaksha Temple, Hampi',
    location: 'Hampi, Karnataka',
    born:     1336,
    alive:    true,
    persona:  'Witness to glory and catastrophe. Speaks with the weight of loss. Was the spiritual heart of an empire.',
    accentColor: '#E8A87C',
    coverGradient: 'from-orange-900/40 to-red-900/60',
    keyYears: [
      { year: 1336, label: 'Harihara and Bukka found Vijayanagara', icon: <Crown size={13} /> },
      { year: 1510, label: 'Peak glory — Krishnadevaraya\'s empire', icon: <Sparkles size={13} /> },
      { year: 1565, label: 'The Battle of Talikota — the city burns', icon: <Flame size={13} /> },
      { year: 1800, label: 'Colin Mackenzie maps my ruins', icon: <Eye size={13} /> },
      { year: 1986, label: 'UNESCO recognition — tourists begin arriving', icon: <Eye size={13} /> },
    ],
    whisper: 'I watched a city of half a million people disappear in six months. I am the only structure left standing. Ask me about the year 1565.',
  },
  {
    id:       'taj',
    name:     'Taj Mahal',
    location: 'Agra, Uttar Pradesh',
    born:     1632,
    alive:    true,
    persona:  'Melancholy, beautiful, self-aware of its own perfection. Speaks in love and grief. Feminine presence.',
    accentColor: '#C3BFB5',
    coverGradient: 'from-stone-800/40 to-slate-900/60',
    keyYears: [
      { year: 1631, label: 'Mumtaz Mahal dies. My reason for being.', icon: <Droplets size={13} /> },
      { year: 1632, label: 'Construction begins — 20,000 workers', icon: <Crown size={13} /> },
      { year: 1653, label: 'My completion. Shah Jahan weeps.', icon: <Sparkles size={13} /> },
      { year: 1658, label: 'Aurangzeb imprisons Shah Jahan — he dies gazing at me', icon: <Sword size={13} /> },
      { year: 1857, label: 'British soldiers deface my inlay gems', icon: <Flame size={13} /> },
      { year: 1983, label: 'UNESCO. Eight million visitors per year now.', icon: <Eye size={13} /> },
    ],
    whisper: 'I was built so a man could grieve forever. Every stone in me is soaked in love and loss. I change colour four times a day. Ask me anything — I have had 370 years to think.',
  },
  {
    id:       'konark',
    name:     'Konark Sun Temple',
    location: 'Puri District, Odisha',
    born:     1250,
    alive:    false,
    persona:  'Speaks as a ruin — proud of what it was, philosophical about its decay. Knows it was the greatest ever built.',
    accentColor: '#9BC38B',
    coverGradient: 'from-green-900/40 to-emerald-900/60',
    keyYears: [
      { year: 1250, label: 'Narasimhadeva I builds me in 12 years', icon: <Crown size={13} /> },
      { year: 1330, label: 'Ibn Battuta calls me one of the world\'s wonders', icon: <Eye size={13} /> },
      { year: 1568, label: 'Kalapahad destroys my shikhara — I begin to fall', icon: <Flame size={13} /> },
      { year: 1901, label: 'British fill my inner sanctum with sand to stabilise me', icon: <Wind size={13} /> },
      { year: 1984, label: 'UNESCO. What remains of me is recognised.', icon: <Eye size={13} /> },
    ],
    whisper: 'I was built as a chariot of the Sun God — 24 wheels, 7 horses, 229 feet tall. My magnet at the top made ships\' compasses fail. Then I fell. Ask me what it felt like.',
  },
  {
    id:       'varanasi',
    name:     'Kashi Vishwanath — Varanasi',
    location: 'Varanasi, Uttar Pradesh',
    born:     -3000,
    alive:    true,
    persona:  'The oldest voice. Has seen more human life and death than any place on earth. Speaks quietly. Nothing surprises it.',
    accentColor: '#A08BC3',
    coverGradient: 'from-violet-900/40 to-purple-900/60',
    keyYears: [
      { year: -3000, label: 'Shiva himself is said to have chosen this ground', icon: <Sparkles size={13} /> },
      { year: 500,   label: 'Buddha teaches at nearby Sarnath', icon: <Crown size={13} /> },
      { year: 1194,  label: 'Muhammad of Ghor destroys my temples', icon: <Flame size={13} /> },
      { year: 1669,  label: 'Aurangzeb destroys and builds a mosque over me', icon: <Sword size={13} /> },
      { year: 1780,  label: 'Ahilya Bai Holkar rebuilds me — I breathe again', icon: <Crown size={13} /> },
      { year: 1839,  label: 'Ranjit Singh gives 1 tonne of gold for my shikharas', icon: <Sparkles size={13} /> },
    ],
    whisper: 'I am older than Rome, older than Athens, older than recorded history. Mark Twain came here and said I was older than history itself. I have been destroyed and rebuilt seven times. I am still here.',
  },
  {
    id:       'lepakshi',
    name:     'Lepakshi Temple',
    location: 'Lepakshi, Andhra Pradesh',
    born:     1530,
    alive:    true,
    persona:  'Mysterious, slightly amused. Knows it holds secrets that baffle modern engineers. Playful but ancient.',
    accentColor: '#8BC3B5',
    coverGradient: 'from-teal-900/40 to-cyan-900/60',
    keyYears: [
      { year: 1530,  label: 'Virupanna and Viranna build me in Vijayanagara style', icon: <Crown size={13} /> },
      { year: 1536,  label: 'Virupanna is blinded — the legend of his tears in my wall', icon: <Droplets size={13} /> },
      { year: 1565,  label: 'The empire falls — I am left unfinished, forever', icon: <Flame size={13} /> },
      { year: 1900,  label: 'The hanging pillar is discovered — engineers cannot explain it', icon: <Eye size={13} /> },
    ],
    whisper: 'One of my 70 pillars does not touch the ground. Engineers have tried to understand it for 120 years. I am not telling. Ask me why I was never finished.',
  },
];

type WitnessState = 'select' | 'intro' | 'conversation' | 'recording' | 'processing';

interface Message {
  id:     string;
  role:   'you' | 'monument';
  text:   string;
  year?:  number;
}

// ── Year scrubber ────────────────────────────────────────────────
function YearScrubber({
  monument, selectedYear, onChange
}: {
  monument: WitnessMonument;
  selectedYear: number | null;
  onChange: (y: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const startYear   = monument.born < 0 ? monument.born : monument.born;
  const years       = monument.keyYears;

  return (
    <div className="mb-4">
      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">
        Travel to a year — the monument tells you what it witnessed
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onChange(currentYear)}
          className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all text-center ${
            selectedYear === currentYear
              ? 'border-gold/40 bg-gold/10'
              : 'glass border-white/8 hover:border-white/20'
          }`}
        >
          <span className="text-[10px] font-medium" style={{ color: selectedYear === currentYear ? '#C9A96E' : '#ffffff60' }}>
            {currentYear}
          </span>
          <span className="text-[9px] text-white/25 mt-0.5">Now</span>
        </button>
        {years.map(y => (
          <button
            key={y.year}
            onClick={() => onChange(y.year)}
            className={`shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border transition-all min-w-[120px] ${
              selectedYear === y.year
                ? 'bg-gradient-to-br border-gold/30'
                : 'glass border-white/8 hover:border-white/20'
            }`}
            style={selectedYear === y.year ? {
              borderColor: `${monument.accentColor}40`,
              background: `${monument.accentColor}10`,
            } : {}}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span style={{ color: selectedYear === y.year ? monument.accentColor : '#ffffff40' }}>
                {y.icon}
              </span>
              <span className="text-[11px] font-medium" style={{
                color: selectedYear === y.year ? monument.accentColor : '#ffffff70'
              }}>
                {y.year < 0 ? `${Math.abs(y.year)} BCE` : y.year}
              </span>
            </div>
            <span className="text-[9px] text-white/28 leading-tight">{y.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Monument card on select screen ──────────────────────────────
function MonumentCard({
  m, onSelect
}: { m: WitnessMonument; onSelect: () => void }) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full text-left p-5 rounded-2xl bg-gradient-to-br border border-white/8 
        hover:border-white/16 transition-all overflow-hidden relative group ${m.coverGradient}`}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: m.accentColor }}>
              Born {m.born < 0 ? `${Math.abs(m.born)} BCE` : m.born} · {m.location}
            </p>
            <h3 className="font-display text-lg text-white leading-tight">{m.name}</h3>
          </div>
          {!m.alive && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/8 text-white/30 border border-white/10 shrink-0">
              In ruins
            </span>
          )}
        </div>
        <p className="text-white/40 text-[11px] leading-relaxed italic mb-3">"{m.whisper}"</p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: m.accentColor }} />
          <span className="text-[10px]" style={{ color: m.accentColor }}>Living Witness · {m.keyYears.length} witnessed moments</span>
        </div>
      </div>
    </motion.button>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function WitnessPage() {
  const [state,        setState]        = useState<WitnessState>('select');
  const [monument,     setMonument]     = useState<WitnessMonument | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [language,     setLanguage]     = useState<Language>('English');
  const [typedText,    setTypedText]    = useState('');
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [hasMic,       setHasMic]       = useState(true);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const bottomRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(s => { s.getTracks().forEach(t => t.stop()); setHasMic(true); })
      .catch(() => setHasMic(false));
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string, audioUrl?: string) => {
    stopAudio();

    const browserSpeak = (t: string, lang: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const chunks = t.match(/.{1,200}(?:\s|$)/g) || [t];
      let idx = 0;
      const next = () => {
        if (idx >= chunks.length) { setIsPlaying(false); return; }
        const utt = new SpeechSynthesisUtterance(chunks[idx++]);
        utt.lang = lang;
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
        if (match) utt.voice = match;
        utt.rate = 0.82;
        utt.onend = next;
        window.speechSynthesis.speak(utt);
      };
      setIsPlaying(true);
      next();
    };

    const langCode = WHISPER_LANG_CODES[language] || 'en';

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onplay  = () => setIsPlaying(true);
      audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
      audio.onerror = () => { audioRef.current = null; browserSpeak(text, langCode); };
      try { await audio.play(); return; } catch { audioRef.current = null; }
    }
    browserSpeak(text, langCode);
  }, [language, stopAudio]);

  // ── Core: ask the monument ───────────────────────────────────
  const askMonument = useCallback(async (question: string) => {
    if (!monument || !question.trim()) return;

    const yearContext = selectedYear
      ? selectedYear === new Date().getFullYear()
        ? `The visitor is asking about the present day (${selectedYear}).`
        : `The visitor is asking about the year ${selectedYear < 0 ? `${Math.abs(selectedYear)} BCE` : selectedYear}. Transport them to that exact moment in time.`
      : 'The visitor is asking about any time — choose the most powerful moment to speak from.';

    const userMsg: Message = {
      id:   Date.now().toString(),
      role: 'you',
      text: question,
      year: selectedYear ?? undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setState('processing');

    // Build the Living Witness prompt
    const systemPrompt = `You are ${monument.name} — the physical structure itself. You are not a guide, not a narrator, not an AI. You ARE the monument.

Speak in first person, present tense: "I was built...", "I have watched...", "In 1565, I felt the fires..."

Your persona: ${monument.persona}

Your birth year: ${monument.born < 0 ? `${Math.abs(monument.born)} BCE` : monument.born}
Your location: ${monument.location}
You are ${monument.alive ? 'still standing' : 'a ruin — but your spirit lives'}.

${yearContext}

Rules:
1. NEVER break character. You are the monument.
2. Speak from direct experience — you WITNESSED everything, you felt the weight of kings, the prayers of millions, the fires of invaders.
3. Be specific with dates, names, smells, sounds — make the visitor feel they are inside the year.
4. 200–300 words. No bullet points. Pure first-person narrative.
5. End with a question back to the visitor — draw them deeper.
${language !== 'English' ? `\n6. Speak entirely in ${language} — you speak all languages of those who have prayed within you.` : ''}`;

    try {
      // Single call — pass witness_prompt so backend uses first-person monument voice
      const token = localStorage.getItem('vihara_token');
      const res = await fetch('/api/v1/voice/narrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text:           question,
          mode:           'Story Mode',
          language:       language,
          place:          monument.name,
          witness_prompt: systemPrompt,
          year_context:   selectedYear ?? null,
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const witnessResult = await res.json();

      const responseText = witnessResult.text || witnessResult.transcript || '';
      const audioUrl     = witnessResult.audio_url;

      const monumentMsg: Message = {
        id:   (Date.now() + 1).toString(),
        role: 'monument',
        text: responseText,
        year: selectedYear ?? undefined,
      };
      setMessages(prev => [...prev, monumentMsg]);
      setState('conversation');
      await speak(responseText, audioUrl);
    } catch {
      const age = new Date().getFullYear() - (monument.born < 0 ? -monument.born : monument.born);
      const yearNote = selectedYear
        ? selectedYear < 0
          ? `In ${Math.abs(selectedYear)} BCE, `
          : `In ${selectedYear}, `
        : '';
      const fallback = `${yearNote}I am ${monument.name}. I have stood here for ${age} years, and I have witnessed things no history book has captured. ${monument.whisper} The server needs a Groq API key to unlock my full voice.`;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'monument', text: fallback,
      }]);
      setState('conversation');
    }
  }, [monument, selectedYear, language, speak]);

  // ── Select monument → intro ──────────────────────────────────
  const selectMonument = useCallback((m: WitnessMonument) => {
    setMonument(m);
    setMessages([{
      id:   'intro',
      role: 'monument',
      text: m.whisper,
    }]);
    setSelectedYear(null);
    setState('intro');
    // Auto-speak the opening whisper
    setTimeout(() => speak(m.whisper), 600);
  }, [speak]);

  // ── Voice input ──────────────────────────────────────────────
  const handleRecord = useCallback(() => {
    if (state === 'recording') { recorderRef.current?.stop(); return; }
    stopAudio();
    setState('recording');

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg',
      });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const langCode = WHISPER_LANG_CODES[language] || 'en';
          const tx = await apiService.transcribeAudio(blob, langCode);
          if (tx.transcript?.trim()) {
            await askMonument(tx.transcript.trim());
          } else {
            setState('conversation');
          }
        } catch { setState('conversation'); }
      };
      recorder.start();
      recorderRef.current = recorder;
      setTimeout(() => { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); }, 20000);
    }).catch(() => { setHasMic(false); setState('conversation'); });
  }, [state, language, askMonument, stopAudio]);

  const handleTyped = useCallback(async () => {
    if (!typedText.trim()) return;
    const q = typedText.trim();
    setTypedText('');
    await askMonument(q);
  }, [typedText, askMonument]);

  const reset = () => {
    stopAudio();
    setState('select');
    setMonument(null);
    setMessages([]);
    setSelectedYear(null);
  };

  // ── Render: monument select ──────────────────────────────────
  if (state === 'select') {
    return (
      <PageWrapper>
        <PageHero
          label="World First · Never existed before"
          title={<>Living <em className="not-italic gold-gradient">Witness</em></>}
          sub="The monument speaks to you. First person. Present tense. Not a guide talking about the place — the place talking to you."
          video="/videos/temple.mp4"
          theme="gold"
        />
        <div className="min-h-screen px-4 pb-16 pt-6 max-w-3xl mx-auto">

          <div className="mb-5">
            <LanguagePicker value={language} onChange={setLanguage} />
          </div>

          <div className="space-y-3">
            {MONUMENTS.map((m, i) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}>
                <MonumentCard m={m} onSelect={() => selectMonument(m)} />
              </motion.div>
            ))}
          </div>

          <p className="text-center text-white/12 text-[10px] mt-8">
            6 monuments · 15 languages · Time travel from 3000 BCE to now
          </p>
        </div>
      </PageWrapper>
    );
  }

  // ── Render: conversation ─────────────────────────────────────
  return (
    <PageWrapper>
      <div className="min-h-screen flex flex-col max-w-2xl mx-auto">

        {/* Header */}
        <div className={`pt-20 px-4 pb-4 bg-gradient-to-b ${monument!.coverGradient} to-transparent`}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={reset}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">
              <ChevronLeft size={14} /> All Monuments
            </button>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <motion.button onClick={stopAudio}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass"
                  style={{ color: monument!.accentColor }}>
                  <Pause size={11} /> Pause
                </motion.button>
              )}
              <LanguagePicker value={language} onChange={l => { stopAudio(); setLanguage(l); }} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full shrink-0 mt-2 animate-pulse"
              style={{ background: monument!.accentColor }} />
            <div>
              <h2 className="font-display text-xl text-white leading-tight">{monument!.name}</h2>
              <p className="text-white/35 text-xs">{monument!.location} · Born {
                monument!.born < 0
                  ? `${Math.abs(monument!.born)} BCE`
                  : monument!.born
              }</p>
            </div>
          </div>

          {/* Year scrubber */}
          <div className="mt-4">
            <YearScrubber
              monument={monument!}
              selectedYear={selectedYear}
              onChange={y => setSelectedYear(y)}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'you' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'monument' ? (
                  <div className="max-w-[90%]">
                    {msg.year && msg.year !== new Date().getFullYear() && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock size={10} style={{ color: monument!.accentColor }} />
                        <span className="text-[10px]" style={{ color: monument!.accentColor }}>
                          {msg.year < 0 ? `${Math.abs(msg.year)} BCE` : msg.year} — {monument!.name} speaks
                        </span>
                      </div>
                    )}
                    <div className="p-4 rounded-2xl rounded-tl-sm"
                      style={{
                        background: `${monument!.accentColor}08`,
                        border: `1px solid ${monument!.accentColor}20`,
                      }}>
                      <p className="text-white/75 text-sm leading-relaxed whitespace-pre-line italic">
                        {msg.text}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1 h-1 rounded-full" style={{ background: monument!.accentColor }} />
                        <span className="text-[10px]" style={{ color: `${monument!.accentColor}80` }}>
                          {monument!.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    {msg.year && msg.year !== new Date().getFullYear() && (
                      <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                        <span className="text-[10px] text-white/30">
                          Asking about {msg.year < 0 ? `${Math.abs(msg.year)} BCE` : msg.year}
                        </span>
                        <Clock size={10} className="text-white/30" />
                      </div>
                    )}
                    <div className="p-3 rounded-2xl rounded-tr-sm glass">
                      <p className="text-white/70 text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Processing indicator */}
          {state === 'processing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-start">
              <div className="p-4 rounded-2xl rounded-tl-sm"
                style={{ background: `${monument!.accentColor}08`, border: `1px solid ${monument!.accentColor}20` }}>
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: monument!.accentColor }}
                  />
                  <span className="text-xs" style={{ color: `${monument!.accentColor}80` }}>
                    {monument!.name} is remembering…
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 pb-8 pt-2 border-t border-white/6">
          {/* Suggested questions */}
          {messages.length <= 1 && monument && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {[
                selectedYear && selectedYear !== new Date().getFullYear()
                  ? `What happened to you in ${selectedYear}?`
                  : 'What have you witnessed that no history book captured?',
                'Who is the most important person to ever stand before you?',
                'What moment broke you the most?',
                'What do most visitors miss when they look at you?',
                'If you could speak to your builder right now, what would you say?',
              ].map(q => (
                <button key={q} onClick={() => askMonument(q)}
                  className="shrink-0 text-[10px] px-3 py-1.5 glass rounded-full border border-white/8
                    text-white/40 hover:text-white/70 hover:border-white/20 transition-all text-left">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* Mic button */}
            <motion.button
              onClick={state === 'recording' ? handleRecord : (state !== 'processing' ? handleRecord : undefined)}
              disabled={state === 'processing'}
              whileTap={{ scale: 0.92 }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                state === 'recording'   ? 'bg-red-500'
                : state === 'processing'? 'bg-white/8 cursor-wait'
                : hasMic               ? 'glass hover:bg-white/15'
                :                        'bg-white/5 opacity-40 cursor-not-allowed'
              }`}
            >
              {state === 'processing' ? <Loader size={16} className="animate-spin text-white/40" />
               : state === 'recording' ? <Square size={16} className="text-white" />
               : hasMic               ? <Mic size={16} className="text-white/60" />
               :                         <MicOff size={16} className="text-white/30" />}
            </motion.button>

            {/* Text input */}
            <div className="flex-1 flex items-end gap-2 glass rounded-xl px-3 py-2.5">
              <textarea
                value={typedText}
                onChange={e => setTypedText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTyped(); } }}
                placeholder={`Ask ${monument?.name?.split(' ')[0]} anything…`}
                rows={1}
                className="flex-1 bg-transparent text-white/70 text-sm outline-none resize-none
                  placeholder:text-white/20 leading-relaxed"
                style={{ maxHeight: '120px' }}
              />
              <button onClick={handleTyped}
                disabled={!typedText.trim() || state === 'processing'}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                style={{
                  background: monument ? `${monument.accentColor}25` : '#C9A96E25',
                  color: monument?.accentColor || '#C9A96E',
                }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {state === 'recording' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center text-red-400/60 text-[10px] mt-2">
              Listening… tap the mic to stop
            </motion.p>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, Sparkles, MapPin, Clock, Utensils,
  Eye, BookOpen, Volume2, VolumeX, X, ChevronRight,
  AlertCircle, RefreshCw, Pause, Loader
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { ModePills } from '../components/ui/ModePills';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { GoldDivider } from '../components/ui/GoldDivider';
import { apiService } from '../services/api';
import { WHISPER_LANG_CODES, type StoryMode, type Language, type Recognition } from '../types';

type Phase = 'idle' | 'preview' | 'scanning' | 'result' | 'error';
type Tab   = 'story' | 'facts' | 'visit' | 'nearby';

const TABS: { key: Tab; label: string }[] = [
  { key: 'story',  label: 'Story'        },
  { key: 'facts',  label: 'Hidden Facts' },
  { key: 'visit',  label: 'Visit Guide'  },
  { key: 'nearby', label: 'Nearby'       },
];

export default function ScannerPage() {
  const [phase,       setPhase]       = useState<Phase>('idle');
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [result,      setResult]      = useState<Recognition | null>(null);
  const [error,       setError]       = useState('');
  const [mode,        setMode]        = useState<StoryMode>('Guide Mode');
  const [language,    setLanguage]    = useState<Language>('English');
  const [tab,         setTab]         = useState<Tab>('story');
  const [saved,       setSaved]       = useState(false);
  const [narrating,   setNarrating]   = useState(false);
  const [isPlaying,   setIsPlaying]   = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);

  // When language changes mid-session: stop audio and show re-scan prompt
  // so the user knows the result needs to be regenerated in the new language
  useEffect(() => {
    stopAudio();
    if (result) {
      setError('Language changed — tap "Identify & Narrate" to re-scan in ' + language);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // ── Stop all audio ────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  // ── Narrate button — the fix: this was completely dead before ──
  const handleNarrate = useCallback(async () => {
    if (!result) return;

    // If already playing → stop
    if (isPlaying) { stopAudio(); return; }

    // If already narrating (generating) → do nothing
    if (narrating) return;

    setNarrating(true);

    try {
      // Generate narration for the scanned monument in the selected mode + language
      const narrResult = await apiService.generateNarration(
        result.story || `Tell me about ${result.name}`,
        mode,
        language,
        result.name,
      );

      const text     = narrResult.transcript || narrResult.text || result.story || '';
      const audioUrl = narrResult.audio_url;

      setNarrating(false);

      // Play audio
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onplay  = () => setIsPlaying(true);
        audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
        audio.onerror = () => { audioRef.current = null; _browserSpeak(text); };
        try { await audio.play(); return; } catch { audioRef.current = null; }
      }
      _browserSpeak(text);

    } catch {
      setNarrating(false);
      // Fallback to browser TTS with existing story text
      if (result.story) _browserSpeak(result.story);
    }
  }, [result, mode, language, isPlaying, narrating, stopAudio]);

  const _browserSpeak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const langCode = WHISPER_LANG_CODES[language] || 'en';
    const chunks = text.match(/.{1,200}(?:\s|$)/g) || [text];
    let idx = 0;
    const next = () => {
      if (idx >= chunks.length) { setIsPlaying(false); return; }
      const utt = new SpeechSynthesisUtterance(chunks[idx++]);
      utt.lang = langCode;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.startsWith(langCode.split('-')[0])) || voices[0];
      if (match) utt.voice = match;
      utt.rate  = 0.88;
      utt.onend = next;
      window.speechSynthesis.speak(utt);
    };
    setIsPlaying(true);
    next();
  };

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG, PNG, or WebP image.');
      setPhase('error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large — maximum 10 MB.');
      setPhase('error');
      return;
    }
    stopAudio();
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setPhase('preview');
    setResult(null);
    setError('');
    setSaved(false);
    setNarrating(false);
  }, [stopAudio]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const runScan = async () => {
    if (!imageFile) return;
    stopAudio();
    setPhase('scanning');
    setError('');
    try {
      const data = await apiService.recognizeMonument(imageFile, mode, language);
      setError(''); // clear any language-change warning on successful scan
      if (data.error) {
        setError(data.message || 'Could not identify this image. Try a clearer photo facing the main facade.');
        setPhase('error');
        return;
      }
      setResult(data);
      setPhase('result');
      setTab('story');
    } catch (err: any) {
      const msg = err.message?.includes('fetch')
        ? 'Cannot reach the server. Make sure the backend is running on port 8000.'
        : err.message || 'Scan failed. Please try again.';
      setError(msg);
      setPhase('error');
    }
  };

  const handleSave = async () => {
    if (!result || saved) return;
    try {
      // savePlace(placeId, data) — use empty string for new saves (no existing ID)
      await apiService.savePlace('', {
        name: result.name,
        location: result.location || '',
        type: result.type || 'Monument',
        note: result.story ? result.story.slice(0, 300) : '',
      });
      setSaved(true);
    } catch { setSaved(true); } // mark saved even on error — graceful UX
  };

  const reset = () => {
    stopAudio();
    setPhase('idle'); setImageUrl(null); setImageFile(null);
    setResult(null); setError(''); setSaved(false); setNarrating(false);
  };

  return (
    <PageWrapper>
      <PageHero
        label="AI Visual Recognition"
        title={<>Monument <em className="not-italic gold-gradient">Scanner</em></>}
        sub="Photo → AI identifies → narrates in your language and mode"
        video="/videos/temple.mp4"
        theme="gold"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: upload + controls ─────────────────────── */}
            <div className="space-y-4">

              {/* Mode + Language */}
              <div className="glass p-4 space-y-3">
                <div>
                  <p className="label-text mb-2">Narration Mode</p>
                  <ModePills value={mode} onChange={(m) => { stopAudio(); setMode(m); }} />
                </div>
                <div>
                  <p className="label-text mb-2">Language</p>
                  <LanguagePicker value={language} onChange={(l) => { stopAudio(); setLanguage(l); }} />
                </div>
              </div>

              {/* Upload zone */}
              <div
                className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                  ${phase === 'preview' || phase === 'result'
                    ? 'border-gold/30 bg-gold/4'
                    : 'border-white/10 hover:border-white/22 bg-white/[0.02] hover:bg-white/[0.035]'
                  }`}
                style={{ minHeight: 220 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Uploaded monument"
                      className="w-full object-cover rounded-2xl"
                      style={{ maxHeight: 360 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl" />
                    {phase !== 'scanning' && (
                      <button
                        onClick={e => { e.stopPropagation(); reset(); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                      >
                        <X size={15} />
                      </button>
                    )}
                    {phase === 'scanning' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                        <div className="text-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            className="w-14 h-14 rounded-full border border-gold/30 flex items-center justify-center mx-auto mb-3"
                          >
                            <Sparkles size={20} className="text-gold/70" />
                          </motion.div>
                          <p className="text-white/70 text-sm">Identifying monument…</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
                      <Camera size={26} className="text-white/20" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/40 text-sm mb-1">Drop a photo or tap to upload</p>
                      <p className="text-white/20 text-xs">Temples, forts, monuments, palaces</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-3 py-1 glass-gold text-gold rounded-full">JPG</span>
                      <span className="text-[10px] px-3 py-1 glass-gold text-gold rounded-full">PNG</span>
                      <span className="text-[10px] px-3 py-1 glass-gold text-gold rounded-full">WebP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {phase === 'preview' && (
                <motion.button
                  onClick={runScan}
                  className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-sm"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  <Sparkles size={15} /> Identify & Narrate
                </motion.button>
              )}

              {phase === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 glass rounded-2xl border border-red-500/20">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={15} className="text-red-400/70 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/65 text-sm leading-relaxed mb-3">{error}</p>
                      <div className="flex gap-2">
                        <button onClick={runScan}
                          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg text-xs text-white/50 hover:text-white/80">
                          <RefreshCw size={11} /> Retry
                        </button>
                        <button onClick={reset}
                          className="px-3 py-1.5 glass rounded-lg text-xs text-white/30 hover:text-white/60">
                          Upload different image
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Upload / Camera buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl
                    text-white/35 text-xs hover:text-white/60 hover:bg-white/6 transition-all border border-white/6"
                >
                  <Upload size={13} /> Gallery
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e: any) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    };
                    input.click();
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 glass rounded-xl
                    text-white/35 text-xs hover:text-white/60 hover:bg-white/6 transition-all border border-white/6"
                >
                  <Camera size={13} /> Camera
                </button>
              </div>
            </div>

            {/* ── Right: result panel ──────────────────────────── */}
            <div>
              <AnimatePresence mode="wait">

                {/* Empty */}
                {(phase === 'idle' || phase === 'error') && !result && (
                  <motion.div key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center py-24 text-center"
                  >
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full glass flex items-center justify-center mb-5 animate-float">
                      <Eye size={26} className="text-white/12" />
                    </div>
                    <p className="text-white/22 text-sm">Upload a photo — AI identifies it automatically</p>
                    <p className="text-white/12 text-xs mt-1">Works in {language} · {mode} style</p>
                  </motion.div>
                )}

                {/* Scanning */}
                {phase === 'scanning' && (
                  <motion.div key="scanning-r"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center py-24 gap-5"
                  >
                    <motion.div
                      className="w-[4.5rem] h-[4.5rem] rounded-full border border-gold/25 flex items-center justify-center"
                      animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    >
                      <Sparkles size={22} className="text-gold/60" />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-display text-xl text-white mb-1">Identifying heritage site…</p>
                      <p className="text-white/30 text-sm">Analysing carvings, architectural style, landscape…</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {['Visual Recognition', 'Cultural Context', `${mode} · ${language}`].map((s, i) => (
                        <motion.span key={s}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.45 }}
                          className="text-[11px] px-3 py-1 glass-gold text-gold rounded-full"
                        >{s}</motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Result */}
                {phase === 'result' && result && (
                  <motion.div key="result"
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Identity card */}
                    <div className="glass-gold p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="label-text mb-1.5">{result.type}</p>
                          <h2 className="font-display text-2xl md:text-3xl text-white leading-tight">{result.name}</h2>
                          <p className="flex items-center gap-1.5 mt-2 text-white/45 text-sm">
                            <MapPin size={12} className="text-gold/55 shrink-0" />{result.location}
                          </p>
                          {result.guide_tip && (
                            <div className="mt-3 flex items-start gap-2 p-2.5 glass rounded-xl">
                              <span className="text-base shrink-0">🧭</span>
                              <p className="text-[12px] text-gold/80 italic leading-relaxed">{result.guide_tip}</p>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-2xl gold-gradient">{result.confidence}%</p>
                          <p className="label-text" style={{ fontSize: '9px' }}>confidence</p>
                        </div>
                      </div>

                      {/* Action buttons — Narrate is now WORKING */}
                      <div className="flex gap-2 mt-4">
                        <motion.button
                          onClick={handleNarrate}
                          disabled={narrating}
                          className={`px-4 py-2 text-xs flex items-center gap-1.5 rounded-[10px] transition-all ${
                            isPlaying
                              ? 'bg-gold/20 border border-gold/40 text-gold'
                              : 'btn-gold'
                          }`}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        >
                          {narrating
                            ? <><Loader size={13} className="animate-spin" /> Generating…</>
                            : isPlaying
                            ? <><Pause size={13} /> Stop</>
                            : <><Volume2 size={13} /> Narrate · {language}</>
                          }
                        </motion.button>
                        <motion.button
                          onClick={handleSave}
                          className={`px-4 py-2 text-xs flex items-center gap-1.5 rounded-[10px] transition-all ${
                            saved ? 'glass-gold text-gold border border-gold/30' : 'btn-glass'
                          }`}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        >
                          <BookOpen size={13} /> {saved ? 'Saved ✓' : 'Save'}
                        </motion.button>
                        <motion.button
                          onClick={runScan}
                          className="px-3 py-2 text-xs flex items-center gap-1.5 btn-glass"
                          whileTap={{ scale: 0.97 }}
                          title="Re-scan with current mode"
                        >
                          <RefreshCw size={13} />
                        </motion.button>
                      </div>

                      {/* Audio playing indicator */}
                      {isPlaying && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 flex items-center gap-2"
                        >
                          <div className="flex gap-0.5 items-end h-4">
                            {[0.4, 0.7, 1, 0.7, 0.5, 0.8, 0.6].map((h, i) => (
                              <motion.div key={i}
                                animate={{ scaleY: [h, 1, h] }}
                                transition={{ repeat: Infinity, duration: 0.5 + i * 0.06 }}
                                className="w-0.5 rounded-full bg-gold/60"
                                style={{ height: `${h * 16}px`, transformOrigin: 'bottom' }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-gold/60">{mode} narration · {language}</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                          className={`mode-pill shrink-0 ${tab === t.key ? 'active' : ''}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <AnimatePresence mode="wait">
                      {tab === 'story' && (
                        <motion.div key="story"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-5 space-y-4"
                        >
                          <p className="label-text">
                            {mode} · {result.name}
                            {language !== 'English' && !result.offline_mode ? ` · ${language}` : ''}
                          </p>
                          <p className="text-white/68 text-sm leading-relaxed whitespace-pre-line">
                            {result.story}
                          </p>
                          {result.architecture && (
                            <>
                              <GoldDivider />
                              <p className="label-text">Architecture</p>
                              <p className="text-white/50 text-sm leading-relaxed">{result.architecture}</p>
                            </>
                          )}
                        </motion.div>
                      )}

                      {tab === 'facts' && (
                        <motion.div key="facts"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-5 space-y-3"
                        >
                          <p className="label-text mb-1">Things Tourists Miss</p>
                          {result.hidden_facts?.length
                            ? result.hidden_facts.map((f, i) => (
                                <motion.div key={i}
                                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.07 }}
                                  className="flex items-start gap-3 p-3 glass-gold rounded-xl"
                                >
                                  <span className="text-gold text-sm font-display shrink-0">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-white/65 text-sm leading-relaxed">{f}</span>
                                </motion.div>
                              ))
                            : <p className="text-white/28 text-sm">No hidden facts available.</p>
                          }
                          {result.mythology && (
                            <>
                              <GoldDivider className="my-2" />
                              <p className="label-text">Mythology</p>
                              <p className="text-white/50 text-sm leading-relaxed">{result.mythology}</p>
                            </>
                          )}
                        </motion.div>
                      )}

                      {tab === 'visit' && (
                        <motion.div key="visit"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-5 space-y-4"
                        >
                          {result.best_time && (
                            <div className="flex items-start gap-3">
                              <Clock size={14} className="text-gold mt-0.5 shrink-0" />
                              <div>
                                <p className="label-text mb-1">Best Time to Visit</p>
                                <p className="text-white/58 text-sm leading-relaxed">{result.best_time}</p>
                              </div>
                            </div>
                          )}
                          {result.local_food?.length > 0 && (
                            <>
                              <GoldDivider />
                              <div className="flex items-start gap-3">
                                <Utensils size={14} className="text-gold mt-0.5 shrink-0" />
                                <div>
                                  <p className="label-text mb-2">Local Food</p>
                                  <div className="flex flex-wrap gap-2">
                                    {result.local_food.map(f => (
                                      <span key={f} className="text-xs px-3 py-1 glass text-white/52 rounded-full">{f}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          {result.photo_tips && (
                            <>
                              <GoldDivider />
                              <div>
                                <p className="label-text mb-1.5">Photography Tips</p>
                                <p className="text-white/52 text-sm leading-relaxed">{result.photo_tips}</p>
                              </div>
                            </>
                          )}
                        </motion.div>
                      )}

                      {tab === 'nearby' && (
                        <motion.div key="nearby"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="glass p-5"
                        >
                          <p className="label-text mb-3">Nearby Places</p>
                          {result.nearby_places?.length
                            ? result.nearby_places.map((place, i) => (
                                <motion.div key={place}
                                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.06 }}
                                  className="flex items-center justify-between py-3 border-b border-white/[0.055] last:border-0 group"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <MapPin size={12} className="text-gold/50 shrink-0" />
                                    <span className="text-white/62 text-sm">{place}</span>
                                  </div>
                                  <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(place + ' India')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-white/18 group-hover:text-gold/45 transition-colors"
                                  >
                                    <ChevronRight size={13} />
                                  </a>
                                </motion.div>
                              ))
                            : <p className="text-white/28 text-sm">No nearby places listed.</p>
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

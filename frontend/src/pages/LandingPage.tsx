import { useEffect, useState, useRef, useCallback, memo } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionTemplate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, MessageSquare, Mic, Map, Star, ChevronDown, Volume2, VolumeX, Play } from 'lucide-react';

/* ── Static data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Camera,
    label: 'RECOGNITION AI',
    title: 'Monument Scanner',
    desc: 'Point your camera at any monument, temple, or heritage site — AI identifies it and begins narrating its complete story.',
    path: '/scan',
    video: '/videos/hero-seg1.mp4',
    accent: '#C9A96E',
  },
  {
    icon: MessageSquare,
    label: 'MULTILINGUAL CHAT',
    title: 'AI Cultural Guide',
    desc: 'Ask anything about history, mythology, architecture, local food, or hidden gems. Like texting a knowledgeable local friend.',
    path: '/chat',
    video: '/videos/hero-seg2.mp4',
    accent: '#8B9DC3',
  },
  {
    icon: Mic,
    label: 'AUDIO STORYTELLING',
    title: 'Voice Narrator',
    desc: 'Close your eyes. AI narrates the history of a place like a documentary — cinematic, emotional, deeply immersive.',
    path: '/voice',
    video: '/videos/hero-seg3.mp4',
    accent: '#C3978B',
  },
  {
    icon: Map,
    label: 'TRIP INTELLIGENCE',
    title: 'Smart Planner',
    desc: 'Build itineraries that make sense. Best timings, local secrets, weather, and cultural context — all woven together.',
    path: '/plan',
    video: '/videos/hero-seg1.mp4',
    accent: '#9BC38B',
  },
];

const STORY_MODES = [
  { mode: 'Guide Mode',   desc: 'Personal guide walking with you',     col: '#C9A96E' },
  { mode: 'Quick Facts',  desc: 'Key information in 60 seconds',       col: '#C9A96E' },
  { mode: 'Deep History', desc: 'Centuries of context, expertly told', col: '#8B9DC3' },
  { mode: 'Story Mode',   desc: 'Narrative immersion experience',      col: '#C3978B' },
  { mode: 'Mythology',    desc: 'Gods, legends & ancient lore',        col: '#9BC38B' },
  { mode: "Kid's Mode",   desc: 'Magical tales for young explorers',   col: '#C3BB8B' },
];

const GEMS = [
  { name: 'Penchalakona', state: 'Andhra Pradesh', type: 'Waterfall Temple',    desc: 'A waterfall cascades through an ancient Shiva temple — devotees believe the water itself is divine.' },
  { name: 'Pulicat Lake', state: 'Tamil Nadu',     type: 'Flamingo Sanctuary',  desc: "India's second largest brackish lake. Thousands of flamingos paint the horizon pink every winter dawn." },
  { name: 'Lepakshi',     state: 'Andhra Pradesh', type: 'Mystery Temple',      desc: 'A 16th-century temple with a pillar that hangs without touching the ground — defying all engineering explanation.' },
  { name: 'Unakoti',      state: 'Tripura',        type: 'Rock-cut Sculptures', desc: 'Nearly 10 million Shiva faces carved into a remote hillside — almost entirely unknown outside the Northeast.' },
];

const STATS = [
  { num: '5000+', label: 'Heritage Sites', sub: 'Across India' },
  { num: '22+',   label: 'Languages',      sub: 'Spoken & Understood' },
  { num: '10K+',  label: 'Hidden Gems',    sub: 'Off Every Map' },
  { num: '∞',     label: 'Stories',        sub: 'Waiting to be told' },
];


/* ── Animated stat ────────────────────────────────────────────────── */
function StatCard({ num, label, sub, delay }: { num: string; label: string; sub: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay }}
      className="text-center"
    >
      <div className="font-display gold-gradient" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1 }}>{num}</div>
      <div className="text-white/70 text-sm font-medium mt-1">{label}</div>
      <div className="label-text mt-0.5" style={{ fontSize: 9 }}>{sub}</div>
    </motion.div>
  );
}

/* ── Feature card with ambient video ─────────────────────────────── */
const FeatureCard = memo(({ f, i }: { f: typeof FEATURES[0]; i: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (inView && vidRef.current) {
      vidRef.current.play().catch(() => {});
    }
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={f.path}>
        <motion.div
          className="relative overflow-hidden cursor-pointer group"
          style={{
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.028)',
          }}
          whileHover={{ y: -6, borderColor: `${f.accent}30` }}
          transition={{ duration: 0.28 }}
        >
          {/* Ambient video background */}
          <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
            <video
              ref={vidRef}
              src={f.video}
              muted
              loop
              playsInline
              preload="metadata"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: 0.35,
                transition: 'opacity 0.5s ease',
              }}
              className="group-hover:[opacity:0.55]"
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.7) 60%, #0a0a0a 100%)`,
            }} />
            <div style={{
              position: 'absolute', top: 16, left: 16,
              padding: '4px 10px',
              background: `${f.accent}18`,
              border: `1px solid ${f.accent}30`,
              borderRadius: 100,
            }}>
              <span style={{ color: f.accent, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{f.label}</span>
            </div>
          </div>

          {/* Text content */}
          <div style={{ padding: '20px 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${f.accent}14`,
                border: `1px solid ${f.accent}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <f.icon size={17} style={{ color: f.accent }} />
              </div>
              <h3 className="font-display text-white" style={{ fontSize: '1.3rem', lineHeight: 1.15 }}>{f.title}</h3>
            </div>
            <p className="text-white/45 text-sm leading-relaxed font-light">{f.desc}</p>
            <div className="mt-4 flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: `${f.accent}80` }}>
              <span className="group-hover:text-[--accent]">Explore</span>
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >→</motion.span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
});

/* ── MAIN LANDING PAGE ────────────────────────────────────────────── */
export default function LandingPage() {
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const heroBrightness = useTransform(scrollYProgress, [0, 0.18], [1, 0.5]);
  const heroFilter = useMotionTemplate`brightness(${heroBrightness})`;

  // Attempt autoplay with audio (browsers may block it)
  const tryPlay = useCallback(async (withAudio: boolean) => {
    const v = heroVideoRef.current;
    if (!v) return;
    v.muted = !withAudio;
    try {
      await v.play();
      setMuted(!withAudio);
    } catch {
      // Fallback: muted autoplay (always succeeds)
      v.muted = true;
      setMuted(true);
      await v.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    tryPlay(false); // try with audio first
  }, [tryPlay]);

  const toggleMute = useCallback(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    setUserInteracted(true);
    const nextMuted = !muted;
    v.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) {
      v.play().catch(() => { v.muted = true; setMuted(true); });
    }
  }, [muted]);

  return (
    <div ref={containerRef} style={{ background: '#0a0a0a' }}>

      {/* ══ HERO — CINEMATIC FULL VIDEO ════════════════════════════ */}
      <section style={{ position: 'relative', height: '100svh', overflow: 'hidden', minHeight: 600 }}>

        {/* Hero video — the uploaded reference video, FULL with audio */}
        <motion.div
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            scale: heroScale,
            transformOrigin: 'center center',
          }}
        >
          <motion.video
            ref={heroVideoRef}
            autoPlay
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              filter: heroFilter as any,
            }}
          >
            <source src="/videos/hero-main.mp4" type="video/mp4" />
          </motion.video>
        </motion.div>

        {/* Gradient overlays — cinematic framing, not hiding the video */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.18) 0%,
              transparent 20%,
              transparent 55%,
              rgba(0,0,0,0.55) 78%,
              rgba(10,10,10,0.95) 100%
            )
          `,
        }} />
        {/* Left/right cinematic bars */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(0,0,0,0.25) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.25) 100%)',
        }} />

        {/* Video loading shimmer */}
        <AnimatePresence>
          {!videoReady && (
            <motion.div
              initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: 'linear-gradient(135deg, #0a0a0a 0%, #111108 50%, #0a0a0a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="font-display gold-gradient"
                style={{ fontSize: '2rem', letterSpacing: '0.15em' }}
              >
                VIHARA
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio control — top right, unobtrusive */}
        <motion.button
          onClick={toggleMute}
          initial={{ opacity: 0 }}
          animate={{ opacity: videoReady ? 1 : 0 }}
          transition={{ delay: 1.5 }}
          style={{
            position: 'absolute', top: 80, right: 20, zIndex: 20,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            width: 42, height: 42,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
            transition: 'all 0.2s',
          }}
          whileHover={{ scale: 1.1, borderColor: 'rgba(201,169,110,0.4)' }}
          whileTap={{ scale: 0.95 }}
          title={muted ? 'Unmute video' : 'Mute video'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-gold" />}
        </motion.button>

        {/* Hero content — left-aligned for cinematic feel */}
        <motion.div
          style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 'clamp(24px, 5vw, 60px)',
            paddingBottom: 'clamp(60px, 8vh, 100px)',
            opacity: heroOpacity,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Label */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
              <span className="label-text" style={{ letterSpacing: '0.2em' }}>Vihara AI · India's Heritage Intelligence</span>
            </motion.div>

            {/* Main title */}
            <h1
              className="font-display text-white"
              style={{
                fontSize: 'clamp(3rem, 9vw, 7rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                marginBottom: 24,
                maxWidth: 700,
              }}
            >
              Discover<br />
              <em className="gold-gradient not-italic">India</em>
              <br />Differently
            </h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                maxWidth: 440,
                lineHeight: 1.75,
                fontWeight: 300,
                marginBottom: 36,
              }}
            >
              AI-powered cultural intelligence that transforms how you experience India's timeless heritage.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.7 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
            >
              <Link to="/scan">
                <motion.button
                  className="btn-gold"
                  style={{ padding: '14px 36px', fontSize: '0.95rem', letterSpacing: '0.03em' }}
                  whileHover={{ scale: 1.04, boxShadow: '0 12px 36px rgba(201,169,110,0.35)' }}
                  whileTap={{ scale: 0.96 }}
                >
                  Scan a Monument
                </motion.button>
              </Link>
              <Link to="/gems">
                <motion.button
                  className="btn-glass"
                  style={{ padding: '13px 32px', fontSize: '0.95rem' }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Hidden Gems
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{
            position: 'absolute', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.3)',
          }}
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <ChevronDown size={18} />
        </motion.div>

        {/* Bottom blur-into-black transition */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 120,
          background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)',
          zIndex: 3, pointerEvents: 'none',
        }} />
      </section>

      {/* ══ STATS TICKER — energy bridge from hero into content ═════ */}
      <section style={{
        background: 'linear-gradient(to bottom, #0a0a0a, #0d0b07)',
        padding: '64px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle gold ambient glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw', height: '60vw', maxWidth: 600, maxHeight: 600,
          background: 'radial-gradient(circle, rgba(201,169,110,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-white/8">
            {STATS.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 0.12} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES — with ambient video backgrounds ════════════════ */}
      <section style={{ background: '#0a0a0a', padding: 'clamp(60px,10vw,120px) 20px' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="label-text mb-4">The Intelligence</p>
            <h2 className="section-title text-white">
              Four Ways to <em className="not-italic gold-gradient">Experience</em>
            </h2>
            <p className="text-white/35 text-sm mt-5 max-w-md mx-auto leading-relaxed font-light">
              Each module powered by AI trained on India's deepest cultural knowledge.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={f.path} f={f} i={i} />)}
          </div>
        </div>
      </section>

      {/* ══ IMMERSIVE VIDEO STRIP — cinematic mid-page break ════════ */}
      <section style={{ position: 'relative', height: 'clamp(280px, 45vw, 520px)', overflow: 'hidden' }}>
        <video
          autoPlay muted loop playsInline preload="metadata"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.42) saturate(1.2)',
          }}
        >
          <source src="/videos/hero-seg2.mp4" type="video/mp4" />
        </video>
        {/* Dark frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, #0a0a0a 0%, transparent 15%, transparent 85%, #0a0a0a 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 5,
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true }}
            className="text-center"
            style={{ padding: '0 20px' }}
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <span
                className="font-display"
                style={{
                  fontSize: 'clamp(1.6rem, 5vw, 3.8rem)',
                  color: 'rgba(255,255,255,0.92)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  display: 'block',
                }}
              >
                "Every stone has a story.<br />
                <span className="gold-gradient">We make it speak."</span>
              </span>
            </motion.div>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              viewport={{ once: true }}
              style={{
                height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.6), transparent)',
                margin: '28px auto 0', maxWidth: 280,
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ══ STORY MODES ═════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(60px,10vw,120px) 20px',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(to bottom, #0a0a0a, #0c0900, #0a0a0a)',
      }}>
        {/* Decorative Om in background */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <motion.span
            className="font-display"
            style={{ fontSize: '28vw', color: 'rgba(201,169,110,0.025)', lineHeight: 1 }}
            animate={{ rotate: [0, 2, 0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
          >ॐ</motion.span>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="mb-14"
          >
            <p className="label-text mb-3">Narration Modes</p>
            <h2 className="section-title text-white max-w-xl">
              Six Ways to <em className="not-italic gold-gradient">Hear the Story</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {STORY_MODES.map((s, i) => (
              <motion.div
                key={s.mode}
                initial={{ opacity: 0, y: 28, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.08, duration: 0.55 }} viewport={{ once: true }}
                className="glass p-5 text-center cursor-pointer"
                whileHover={{ y: -6, borderColor: `${s.col}28`, background: `${s.col}08` }}
              >
                <motion.div
                  className="w-9 h-9 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: `${s.col}14`, border: `1px solid ${s.col}30` }}
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Star size={14} style={{ color: s.col }} />
                </motion.div>
                <div className="text-sm font-medium text-white/78 mb-1">{s.mode}</div>
                <div className="text-[11px] text-white/35 leading-relaxed">{s.desc}</div>
              </motion.div>
            ))}
          </div>

          {/* Narration sample */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }} viewport={{ once: true }}
            className="mt-14 glass-gold p-8 md:p-10"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {/* Ambient glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 200, height: 200,
              background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div className="flex items-center gap-2.5 mb-5">
              <motion.div className="w-2 h-2 rounded-full bg-gold"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} />
              <p className="label-text">Story Mode · Taj Mahal, Agra</p>
            </div>
            <p className="font-display text-[1.25rem] md:text-[1.45rem] text-white/88 leading-relaxed italic">
              "It was 1631. Shah Jahan stood at his wife's deathbed as she whispered her final wish —
              <span className="text-gold"> that he build something the world would never forget.</span>
              {" "}She died giving birth to their fourteenth child. What followed was 22 years, 20,000 workers,
              and the greatest love letter ever carved in marble…"
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Link to="/voice">
                <motion.button className="btn-gold px-5 py-2 text-sm flex items-center gap-2"
                  whileHover={{ scale: 1.03 }}>
                  <Play size={12} fill="currentColor" /> Listen Now
                </motion.button>
              </Link>
              <span className="text-white/28 text-xs">AI-generated · Story Mode narration</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ HIDDEN GEMS ═════════════════════════════════════════════ */}
      <section style={{ padding: 'clamp(60px,10vw,120px) 20px', background: '#0a0a0a' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }} viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-12"
          >
            <div>
              <p className="label-text mb-3">Beyond the Tourist Trail</p>
              <h2 className="section-title text-white">Hidden <em className="not-italic gold-gradient">Gems</em></h2>
            </div>
            <Link to="/gems">
              <motion.button className="btn-glass px-5 py-2.5 text-sm whitespace-nowrap" whileHover={{ scale: 1.03 }}>
                Explore All →
              </motion.button>
            </Link>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GEMS.map((g, i) => (
              <motion.div
                key={g.name}
                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }} viewport={{ once: true }}
                className="glass p-5 cursor-pointer"
                whileHover={{ y: -6, borderColor: 'rgba(201,169,110,0.2)', background: 'rgba(201,169,110,0.03)' }}
              >
                <p className="label-text mb-2" style={{ fontSize: 9.5 }}>{g.type}</p>
                <h3 className="font-display text-[1.15rem] text-white mb-0.5">{g.name}</h3>
                <p className="text-[11px] text-white/35 mb-3">{g.state}</p>
                <div className="divider-gold mb-3" />
                <p className="text-[12.5px] text-white/45 leading-relaxed font-light">{g.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FINAL VIDEO BREAK ═══════════════════════════════════════ */}
      <section style={{ position: 'relative', height: 'clamp(220px, 38vw, 420px)', overflow: 'hidden' }}>
        <video autoPlay muted loop playsInline preload="metadata"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'brightness(0.38) saturate(1.3)',
          }}>
          <source src="/videos/hero-seg3.mp4" type="video/mp4" />
        </video>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, #0a0a0a 0%, transparent 18%, transparent 82%, #0a0a0a 100%)',
        }} />
      </section>

      {/* ══ CTA ═════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', padding: 'clamp(60px,10vw,120px) 20px',
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #0a0a0a, #0d0900, #0a0a0a)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} viewport={{ once: true }}
          className="relative max-w-2xl mx-auto text-center"
        >
          <p className="label-text mb-5">Begin Your Journey</p>
          <h2 className="section-title text-white mb-5">
            India Has Been Waiting<br />
            <em className="not-italic gold-gradient">To Tell Its Story</em>
          </h2>
          <p className="text-white/40 font-light leading-relaxed mb-9 max-w-lg mx-auto" style={{ fontSize: '1rem' }}>
            Join thousands of travelers who've discovered a deeper connection with India's heritage through AI-powered storytelling.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/scan">
              <motion.button
                className="btn-gold px-10 py-3.5"
                style={{ fontSize: '0.95rem' }}
                whileHover={{ scale: 1.04, boxShadow: '0 14px 40px rgba(201,169,110,0.3)' }}
                whileTap={{ scale: 0.96 }}
              >
                Start Exploring Free
              </motion.button>
            </Link>
            <Link to="/chat">
              <motion.button
                className="btn-glass px-8 py-3.5"
                style={{ fontSize: '0.95rem' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Ask the AI Guide
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.055)', padding: '40px 20px' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <span className="font-display text-[1.1rem] gold-gradient">Vihara AI</span>
            <p className="label-text mt-1" style={{ fontSize: 9 }}>{`© ${new Date().getFullYear()} Cultural Intelligence Platform`}</p>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {['Privacy', 'Terms', 'Contact', 'Blog'].map(l => (
              <a key={l} href="#" className="text-white/28 hover:text-white/55 transition-colors" style={{ fontSize: 12.5 }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

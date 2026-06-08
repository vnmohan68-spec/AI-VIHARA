import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import CinematicVideo from './CinematicVideo';

type Theme = 'gold' | 'ocean' | 'forest' | 'sky' | 'dusk';

interface PageHeroProps {
  label: string;
  title: ReactNode;
  sub?: string;
  video: string;
  theme?: Theme;
  right?: ReactNode;
}

export default function PageHero({ label, title, sub, video, theme = 'gold', right }: PageHeroProps) {
  return (
    <div style={{ position: 'relative', height: 340, overflow: 'hidden', marginBottom: 0 }}>
      {/* Cinematic video background */}
      <CinematicVideo src={video} theme={theme} opacity={0.65} zoom />

      {/* Gradient overlays — top dark for nav, bottom fades into page */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 40%, rgba(10,10,10,0.96) 100%)',
      }} />

      {/* Content — vertically centred */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        display: 'flex', alignItems: 'center',
        padding: '0 32px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1 }}
        >
          <motion.p
            className="label-text"
            style={{ marginBottom: 10, letterSpacing: '0.2em' }}
            initial={{ opacity: 0, letterSpacing: '0.32em' }}
            animate={{ opacity: 1, letterSpacing: '0.2em' }}
            transition={{ duration: 0.9 }}
          >
            {label}
          </motion.p>
          <h1 className="hero-title text-white" style={{ lineHeight: 1.05, marginBottom: sub ? 10 : 0 }}>
            {title}
          </h1>
          {sub && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', maxWidth: 560, fontWeight: 300, lineHeight: 1.6 }}>
              {sub}
            </p>
          )}
        </motion.div>
        {right && (
          <motion.div
            style={{ flexShrink: 0 }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {right}
          </motion.div>
        )}
      </div>

      {/* Bottom gold hairline */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, zIndex: 4,
        background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.25) 30%, rgba(201,169,110,0.25) 70%, transparent)',
      }} />
    </div>
  );
}

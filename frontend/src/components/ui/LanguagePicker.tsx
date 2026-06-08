import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown } from 'lucide-react';
import { INDIAN_LANGUAGES, INTERNATIONAL_LANGUAGES, type Language } from '../../types';

interface Props {
  value: Language;
  onChange: (l: Language) => void;
  compact?: boolean;
}

const FLAG_HINTS: Partial<Record<Language, string>> = {
  English: '🇮🇳', Hindi: '🇮🇳', Telugu: '🇮🇳', Tamil: '🇮🇳',
  Bengali: '🇮🇳', Kannada: '🇮🇳', Gujarati: '🇮🇳', Marathi: '🇮🇳', Malayalam: '🇮🇳',
  French: '🇫🇷', German: '🇩🇪', Spanish: '🇪🇸', Japanese: '🇯🇵', Chinese: '🇨🇳', Arabic: '🇸🇦',
};

export function LanguagePicker({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (compact) {
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className="btn-glass px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-xl"
        >
          <Globe size={12} className="text-gold" />
          <span>{FLAG_HINTS[value]} {value}</span>
          <ChevronDown size={10} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute right-0 top-9 z-50 glass-dark border border-white/[0.08] rounded-xl p-3 min-w-[180px]"
              onClick={e => e.stopPropagation()}
            >
              <p className="label-text mb-2 px-1">Indian Languages</p>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {INDIAN_LANGUAGES.map(l => (
                  <button key={l} onClick={() => { onChange(l); setOpen(false); }}
                    className={`text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                      value === l ? 'glass-gold text-gold' : 'text-white/45 hover:text-white/75 hover:bg-white/4'
                    }`}
                  >
                    {FLAG_HINTS[l]} {l}
                  </button>
                ))}
              </div>
              <p className="label-text mb-2 px-1">International</p>
              <div className="grid grid-cols-2 gap-1">
                {INTERNATIONAL_LANGUAGES.map(l => (
                  <button key={l} onClick={() => { onChange(l); setOpen(false); }}
                    className={`text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                      value === l ? 'glass-gold text-gold' : 'text-white/45 hover:text-white/75 hover:bg-white/4'
                    }`}
                  >
                    {FLAG_HINTS[l]} {l}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full inline version (for sidebar)
  return (
    <div>
      <p className="label-text mb-2">Indian Languages</p>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {INDIAN_LANGUAGES.map(l => (
          <button key={l} onClick={() => onChange(l)}
            className={`px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
              value === l ? 'glass-gold text-gold border border-gold/22' : 'glass text-white/32 hover:text-white/58'
            }`}
          >
            {FLAG_HINTS[l]} {l}
          </button>
        ))}
      </div>
      <p className="label-text mb-2">International</p>
      <div className="grid grid-cols-2 gap-1.5">
        {INTERNATIONAL_LANGUAGES.map(l => (
          <button key={l} onClick={() => onChange(l)}
            className={`px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
              value === l ? 'glass-gold text-gold border border-gold/22' : 'glass text-white/32 hover:text-white/58'
            }`}
          >
            {FLAG_HINTS[l]} {l}
          </button>
        ))}
      </div>
    </div>
  );
}

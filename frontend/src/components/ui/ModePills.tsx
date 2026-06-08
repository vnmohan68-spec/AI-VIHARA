import { motion } from 'framer-motion';
import { STORY_MODES, MODE_DESCRIPTIONS, type StoryMode } from '../../types';

interface Props {
  value: StoryMode;
  onChange: (m: StoryMode) => void;
  className?: string;
  showDescription?: boolean;
}

const MODE_COLORS: Record<StoryMode, string> = {
  'Guide Mode':   '#C9A96E',
  'Quick Facts':  '#9BC38B',
  'Deep History': '#8B9DC3',
  'Story Mode':   '#C3978B',
  'Mythology':    '#A08BC3',
  "Kid's Mode":   '#C3BB8B',
};

export function ModePills({ value, onChange, className = '', showDescription = false }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {STORY_MODES.map(m => {
        const active = value === m;
        const color  = MODE_COLORS[m];
        return (
          <motion.button
            key={m}
            onClick={() => onChange(m)}
            className="mode-pill relative"
            style={active ? {
              background:   `${color}18`,
              borderColor:  `${color}45`,
              color:         color,
            } : {}}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {m === 'Guide Mode' && active && (
              <span className="mr-1">🧭</span>
            )}
            {m}
          </motion.button>
        );
      })}
    </div>
  );
}

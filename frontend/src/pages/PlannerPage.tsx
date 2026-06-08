import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, Compass, Clock, Sun, Cloud, CloudRain,
  Star, AlertCircle, Thermometer, Droplets, Wind, ExternalLink,
  Map, ShieldAlert, TrendingDown, Eye, IndianRupee, Flame, Loader,
  CheckSquare, Square, Plus, Trash2, ListChecks, Download, GripVertical,
  Tag, Flag
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { apiService } from '../services/api';
import type { Language } from '../types';

const INTERESTS = ['Heritage','Hidden Gems','Architecture','Mythology','Food','Photography','Nature','Villages','Temples','Forts'];
const POPULAR   = ['Hampi','Varanasi','Jaipur','Thanjavur','Mysuru','Udaipur','Konark','Rishikesh','Madurai','Khajuraho'];

// ── Detect intelligence type from tip text ────────────────────────
type IntelType = 'timing' | 'crowd' | 'cost' | 'secret';

function detectType(tip: string): IntelType {
  if (!tip) return 'secret';
  const t = tip.toLowerCase();
  if (t.startsWith('[timing]') || t.includes('closed') || t.includes('opens') || t.includes('puja') || t.includes('am.') || t.includes('pm.') || t.includes('timing')) return 'timing';
  if (t.startsWith('[crowd]') || t.includes('crowd') || t.includes('visitors') || t.includes('busy') || t.includes('empty') || t.includes('tuesday') || t.includes('weekday')) return 'crowd';
  if (t.startsWith('[cost]') || t.includes('₹') || t.includes('entry') || t.includes('fee') || t.includes('free') || t.includes('deposit') || t.includes('auto')) return 'cost';
  return 'secret';
}

const INTEL_CONFIG: Record<IntelType, { label: string; color: string; bg: string; border: string; Icon: any }> = {
  timing: { label: 'Timing',        color: '#E8A87C', bg: 'bg-orange-500/8',  border: 'border-orange-400/22', Icon: ShieldAlert   },
  crowd:  { label: 'Crowd Intel',   color: '#8B9DC3', bg: 'bg-blue-500/8',    border: 'border-blue-400/22',   Icon: TrendingDown  },
  cost:   { label: 'Real Cost',     color: '#9BC38B', bg: 'bg-green-500/8',   border: 'border-green-400/22',  Icon: IndianRupee   },
  secret: { label: 'Insider Secret',color: '#C9A96E', bg: 'bg-gold/6',        border: 'border-gold/20',       Icon: Eye           },
};

// ── Strip [TAG] prefix from tip text for display ──────────────────
function cleanTip(tip: string): string {
  return tip.replace(/^\[(TIMING|CROWD|COST|SECRET)\]\s*/i, '').trim();
}

// ── Weather icon ──────────────────────────────────────────────────
function WeatherIcon({ desc }: { desc?: string }) {
  if (!desc) return <Sun size={13} className="text-gold/60" />;
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('thunder')) return <CloudRain size={13} className="text-blue-400/70" />;
  if (d.includes('cloud') || d.includes('overcast')) return <Cloud size={13} className="text-white/40" />;
  return <Sun size={13} className="text-gold/60" />;
}

// ── Live weather widget ───────────────────────────────────────────
function WeatherWidget({ city }: { city: string }) {
  const [w, setW]     = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!city.trim()) return;
    setBusy(true);
    apiService.getWeather(city)
      .then(d => setW(d))
      .catch(() => setW(null))
      .finally(() => setBusy(false));
  }, [city]);

  if (busy) return (
    <div className="glass p-3 rounded-xl flex items-center gap-2">
      <Loader size={13} className="animate-spin text-gold/40" />
      <span className="text-white/30 text-xs">Fetching live weather…</span>
    </div>
  );
  if (!w?.available) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="glass p-3 rounded-xl border border-gold/15">
      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Thermometer size={10} className="text-gold/50" /> Live Weather · {w.city}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WeatherIcon desc={w.description} />
          <div>
            <p className="font-display text-2xl gold-gradient">{w.temp}°C</p>
            <p className="text-white/40 text-xs">{w.description}</p>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-1 justify-end">
            <Thermometer size={10} className="text-white/25" />
            <span className="text-white/35 text-[10px]">Feels {w.feels_like}°C</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <Droplets size={10} className="text-white/25" />
            <span className="text-white/35 text-[10px]">{w.humidity}% humidity</span>
          </div>
          {w.wind_speed > 0 && (
            <div className="flex items-center gap-1 justify-end">
              <Wind size={10} className="text-white/25" />
              <span className="text-white/35 text-[10px]">{w.wind_speed} km/h</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Intelligence badge (the actual differentiator UI) ────────────
function IntelBadge({ tip, expanded }: { tip: string; expanded?: boolean }) {
  const type = detectType(tip);
  const cfg  = INTEL_CONFIG[type];
  const clean = cleanTip(tip);
  const Icon = cfg.Icon;

  if (!expanded) {
    return (
      <div className="flex items-start gap-1.5 mt-1.5">
        <Icon size={9} style={{ color: cfg.color }} className="shrink-0 mt-0.5" />
        <p className="text-[10px] leading-relaxed italic truncate" style={{ color: `${cfg.color}90` }}>
          {clean}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-xl mt-2 ${cfg.bg} border ${cfg.border}`}>
      <Icon size={11} style={{ color: cfg.color }} className="shrink-0 mt-0.5" />
      <div>
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: cfg.color }}>
          {cfg.label} ·{' '}
        </span>
        <span className="text-[11px] text-white/65 leading-relaxed">{clean}</span>
      </div>
    </div>
  );
}

// ── Place row ─────────────────────────────────────────────────────
function PlaceRow({ p, idx }: { p: any; idx: number }) {
  const [open, setOpen] = useState(false);
  const gmUrl = `https://maps.google.com/?q=${encodeURIComponent(p.name + ' India')}`;
  const type  = p.tip ? detectType(p.tip) : 'secret';
  const cfg   = INTEL_CONFIG[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div
        className="flex gap-3 p-3 cursor-pointer select-none"
        onClick={() => p.tip && setOpen(v => !v)}
      >
        {/* Time column */}
        <div className="text-center min-w-[52px] shrink-0">
          <p className="text-[11px] font-medium text-gold">{p.time}</p>
          <p className="text-[10px] text-white/25 mt-0.5">{p.duration}</p>
          {p.entry_cost && (
            <p className="text-[9px] text-green-400/60 mt-1">{p.entry_cost}</p>
          )}
        </div>

        <div className="w-px bg-white/8 self-stretch shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <p className="text-white/80 text-sm font-medium leading-tight truncate">{p.name}</p>
              <a href={gmUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0 opacity-40 hover:opacity-80 transition-opacity">
                <ExternalLink size={10} className="text-gold/60" />
              </a>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {p.type && (
                <span className="text-[10px] px-2 py-0.5 glass text-white/40 rounded-full border border-white/8">
                  {p.type}
                </span>
              )}
              {/* Significance stars */}
              {p.significance && (
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={8}
                      className={i <= p.significance ? 'text-gold/70' : 'text-white/10'}
                      fill={i <= p.significance ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
              )}
              {/* Intel type dot */}
              {p.tip && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: cfg.color }} />
              )}
            </div>
          </div>

          {/* Collapsed: one-line preview of tip */}
          {p.tip && !open && <IntelBadge tip={p.tip} expanded={false} />}
        </div>
      </div>

      {/* Expanded intel */}
      <AnimatePresence>
        {open && p.tip && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3">
              <IntelBadge tip={p.tip} expanded={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Day panel ─────────────────────────────────────────────────────
function DayPanel({ day, dest }: { day: any; dest: string }) {
  const places    = day.places || [];
  const timingCt  = places.filter((p: any) => p.tip && detectType(p.tip) === 'timing').length;
  const crowdCt   = places.filter((p: any) => p.tip && detectType(p.tip) === 'crowd').length;
  const costCt    = places.filter((p: any) => p.tip && detectType(p.tip) === 'cost').length;
  const secretCt  = places.filter((p: any) => p.tip && detectType(p.tip) === 'secret').length;
  const dayMapUrl = `https://maps.google.com/?q=${encodeURIComponent(dest + ' ' + day.title)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-3"
    >
      {/* Day header */}
      <div className="glass p-4 border border-gold/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] text-gold/60 uppercase tracking-wider">
                {day.date || `Day ${day.day}`}
              </p>
            </div>
            <h3 className="font-display text-lg text-white leading-snug">{day.title}</h3>
            {day.travel_tip && (
              <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed italic">
                🗺 {day.travel_tip}
              </p>
            )}

            {/* Intelligence summary */}
            {(timingCt + crowdCt + costCt + secretCt) > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {timingCt > 0 && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-400/20 text-orange-300/80">
                    <ShieldAlert size={8} /> {timingCt} timing
                  </span>
                )}
                {crowdCt > 0 && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300/80">
                    <TrendingDown size={8} /> {crowdCt} crowd
                  </span>
                )}
                {costCt > 0 && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-400/20 text-green-300/80">
                    <IndianRupee size={8} /> {costCt} cost
                  </span>
                )}
                {secretCt > 0 && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-gold/8 border border-gold/18 text-gold/75">
                    <Eye size={8} /> {secretCt} secret
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Temp + weather */}
          <div className="text-right shrink-0">
            {day.temp && (
              <p className="font-display text-xl gold-gradient">{day.temp}</p>
            )}
            {day.weather && (
              <p className="flex items-center gap-1 justify-end text-[11px] text-white/35 mt-0.5">
                <WeatherIcon desc={day.weather} /> {day.weather}
              </p>
            )}
            <a href={dayMapUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 justify-end text-[10px] text-gold/40 hover:text-gold mt-1 transition-colors">
              <Map size={9} /> Map
            </a>
          </div>
        </div>
      </div>

      {/* Places */}
      <div className="space-y-2">
        <p className="text-white/25 text-[10px] uppercase tracking-wider px-1 flex items-center gap-1.5">
          Places · tap any row for intel
        </p>
        {places.map((p: any, i: number) => (
          <PlaceRow key={`${p.name}-${i}`} p={p} idx={i} />
        ))}
      </div>

      {/* Food */}
      {day.food?.length > 0 && (
        <div className="glass p-4">
          <p className="text-white/25 text-[10px] uppercase tracking-wider mb-3">Where to Eat</p>
          {day.food.map((f: string, i: number) => (
            <div key={i} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
              <div className="w-1 h-1 rounded-full bg-gold/35 shrink-0 mt-2" />
              <p className="text-white/55 text-xs leading-relaxed">{f}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Date range picker ─────────────────────────────────────────────
function DateRangePicker({
  startDate, endDate, onStartChange, onEndChange, onDaysChange
}: {
  startDate: string; endDate: string;
  onStartChange: (v: string) => void;
  onEndChange:   (v: string) => void;
  onDaysChange:  (n: number) => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  const handleStart = (v: string) => {
    onStartChange(v);
    if (v && endDate && endDate >= v) {
      const diff = Math.round(
        (new Date(endDate).getTime() - new Date(v).getTime()) / 86400000
      ) + 1;
      if (diff >= 1 && diff <= 30) onDaysChange(diff);
    }
  };

  const handleEnd = (v: string) => {
    onEndChange(v);
    if (startDate && v && v >= startDate) {
      const diff = Math.round(
        (new Date(v).getTime() - new Date(startDate).getTime()) / 86400000
      ) + 1;
      if (diff >= 1 && diff <= 30) onDaysChange(diff);
    }
  };

  return (
    <div>
      <label className="label-text mb-2 block flex items-center gap-1.5">
        <Calendar size={11} className="text-gold/60" /> Travel Dates
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-white/30 text-[10px] mb-1">From</p>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={e => handleStart(e.target.value)}
            className="w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2
              text-white/70 text-xs outline-none focus:border-gold/30
              transition-all [color-scheme:dark]"
          />
        </div>
        <div>
          <p className="text-white/30 text-[10px] mb-1">To</p>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={e => handleEnd(e.target.value)}
            className="w-full bg-white/6 border border-white/10 rounded-xl px-3 py-2
              text-white/70 text-xs outline-none focus:border-gold/30
              transition-all [color-scheme:dark]"
          />
        </div>
      </div>
      {startDate && endDate && endDate >= startDate && (
        <p className="text-[10px] text-gold/60 mt-1.5 flex items-center gap-1">
          <Calendar size={9} />
          {Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1} days
          · {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {' – '}
          {new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}


// ── Todo List — fluid, categorised, drag-aware ────────────────────
type Priority = 'high' | 'normal' | 'low';
interface TodoItem {
  id: string; text: string; done: boolean;
  priority: Priority; category: string;
}
const CATEGORIES   = ['General', 'Booking', 'Packing', 'Documents', 'Food', 'Transport'];
const PRIORITY_CFG: Record<Priority, { color: string; label: string }> = {
  high:   { color: '#e87c7c', label: '!' },
  normal: { color: '#C9A96E', label: '·' },
  low:    { color: '#8B9DC3', label: '↓' },
};
const QUICK_ITEMS = [
  { text: 'Book train/bus tickets', category: 'Booking', priority: 'high' as Priority },
  { text: 'Check entry fees & timings', category: 'Booking', priority: 'high' as Priority },
  { text: 'Download offline maps', category: 'General', priority: 'normal' as Priority },
  { text: 'Carry valid photo ID', category: 'Documents', priority: 'high' as Priority },
  { text: 'Temple dress code (cover knees/shoulders)', category: 'Packing', priority: 'normal' as Priority },
  { text: 'Local emergency number saved', category: 'General', priority: 'normal' as Priority },
];

function TodoList({ destination }: { destination: string }) {
  const storageKey  = `vihara_todo_${(destination || 'default').toLowerCase().replace(/\s+/g, '_')}`;
  const [items,     setItems]     = useState<TodoItem[]>([]);
  const [input,     setInput]     = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [priority,  setPriority]  = useState<Priority>('normal');
  const [category,  setCategory]  = useState('General');
  const [showQuick, setShowQuick] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragId   = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  // Load from localStorage when storageKey changes (destination changes)
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { setItems([]); }
  }, [storageKey]);

  // Persist on every change
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
  }, [items, storageKey]);

  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    setItems(prev => [{
      id: Date.now().toString(), text, done: false, priority, category,
    }, ...prev]);
    setInput('');
    inputRef.current?.focus();
  };

  const addQuick = (q: typeof QUICK_ITEMS[0]) => {
    if (items.some(i => i.text === q.text)) return;
    setItems(prev => [...prev, {
      id: Date.now().toString(), text: q.text,
      done: false, priority: q.priority, category: q.category,
    }]);
  };

  const toggleItem   = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const deleteItem   = (id: string) => setItems(p => p.filter(i => i.id !== id));
  const clearDone    = ()           => setItems(p => p.filter(i => !i.done));
  const cyclePriority = (id: string) => setItems(p => p.map(i => {
    if (i.id !== id) return i;
    const next: Priority = i.priority === 'normal' ? 'high' : i.priority === 'high' ? 'low' : 'normal';
    return { ...i, priority: next };
  }));

  // Drag-to-reorder
  const handleDragStart = (id: string) => { dragId.current = id; };
  const handleDragEnter = (id: string) => { dragOver.current = id; };
  const handleDragEnd   = ()            => {
    if (!dragId.current || !dragOver.current || dragId.current === dragOver.current) return;
    setItems(prev => {
      const arr  = [...prev];
      const from = arr.findIndex(i => i.id === dragId.current);
      const to   = arr.findIndex(i => i.id === dragOver.current);
      if (from < 0 || to < 0) return prev;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      return arr;
    });
    dragId.current = null; dragOver.current = null;
  };

  const visible  = catFilter === 'All' ? items : items.filter(i => i.category === catFilter);
  const doneCount = items.filter(i => i.done).length;
  const highCount = items.filter(i => !i.done && i.priority === 'high').length;

  return (
    <div className="glass p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks size={13} className="text-gold/70" />
          <p className="label-text">Trip Checklist</p>
          {highCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400/80 border border-red-500/20">
              {highCount} urgent
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className="text-[10px] text-white/25">{doneCount}/{items.length}</span>
          )}
          {doneCount > 0 && (
            <button onClick={clearDone}
              className="text-[9px] text-white/20 hover:text-red-400/50 transition-colors">
              clear done
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="h-0.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: doneCount === items.length ? '#9BC38B' : '#C9A96E' }}
            animate={{ width: `${(doneCount / items.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* Add item row */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder={destination ? `Add task for ${destination}…` : 'Add a task…'}
            className="flex-1 bg-transparent text-white/70 text-xs outline-none placeholder-white/22 border-b border-white/10 pb-1 focus:border-gold/30 transition-colors"
          />
          <motion.button onClick={addItem}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            disabled={!input.trim()}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: input.trim() ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.05)' }}
          >
            <Plus size={13} className={input.trim() ? 'text-gold' : 'text-white/20'} />
          </motion.button>
        </div>

        {/* Priority + Category selectors */}
        <div className="flex gap-2 flex-wrap">
          {(['high', 'normal', 'low'] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border transition-all ${
                priority === p ? 'border-current opacity-100' : 'border-white/10 opacity-40 hover:opacity-70'
              }`}
              style={{ color: PRIORITY_CFG[p].color, borderColor: priority === p ? PRIORITY_CFG[p].color + '50' : undefined }}
            >
              <Flag size={8} /> {p}
            </button>
          ))}
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="text-[9.5px] bg-transparent text-white/30 outline-none border-b border-white/10 cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Quick-add templates */}
      <div>
        <button onClick={() => setShowQuick(v => !v)}
          className="flex items-center gap-1 text-[9.5px] text-white/25 hover:text-white/45 transition-colors">
          <Tag size={9} /> Quick add templates {showQuick ? '▲' : '▼'}
        </button>
        <AnimatePresence>
          {showQuick && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden mt-2 space-y-1">
              {QUICK_ITEMS.map(q => (
                <button key={q.text} onClick={() => addQuick(q)}
                  disabled={items.some(i => i.text === q.text)}
                  className="w-full text-left flex items-center gap-2 text-[10px] py-1 px-2 rounded-lg hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed group">
                  <span style={{ color: PRIORITY_CFG[q.priority].color }} className="shrink-0 text-[8px]">●</span>
                  <span className="text-white/45 flex-1">{q.text}</span>
                  <Plus size={9} className="text-white/20 group-hover:text-white/40 shrink-0" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category filter pills */}
      {items.length > 3 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {['All', ...CATEGORIES.filter(c => items.some(i => i.category === c))].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`shrink-0 text-[9.5px] px-2 py-0.5 rounded-full border transition-all ${
                catFilter === c
                  ? 'border-gold/30 bg-gold/10 text-gold/80'
                  : 'border-white/10 text-white/25 hover:text-white/45'
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Item list — drag to reorder */}
      <AnimatePresence>
        {visible.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-white/20 text-[10px] text-center py-2">
            {items.length > 0 ? `No ${catFilter} tasks` : 'Add tasks — or use quick-add templates above'}
          </motion.p>
        )}
        {visible.map(item => (
          <motion.div key={item.id}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.18 }}
            draggable
            onDragStart={() => handleDragStart(item.id)}
            onDragEnter={() => handleDragEnter(item.id)}
            onDragEnd={handleDragEnd}
            onDragOver={e => e.preventDefault()}
            className="flex items-center gap-2 group py-0.5 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={10} className="text-white/10 group-hover:text-white/25 shrink-0 transition-colors" />
            <button onClick={() => cyclePriority(item.id)} className="shrink-0"
              title={`Priority: ${item.priority} (click to cycle)`}>
              <span className="text-[10px] font-bold" style={{ color: PRIORITY_CFG[item.priority].color }}>
                {PRIORITY_CFG[item.priority].label}
              </span>
            </button>
            <button onClick={() => toggleItem(item.id)} className="shrink-0">
              {item.done
                ? <CheckSquare size={13} className="text-gold/60" />
                : <Square size={13} className="text-white/22 group-hover:text-white/42 transition-colors" />
              }
            </button>
            <span className={`flex-1 text-xs leading-snug transition-all ${
              item.done ? 'line-through text-white/22' : 'text-white/62'
            }`}>
              {item.text}
            </span>
            <span className="text-[8px] text-white/15 group-hover:text-white/25 shrink-0 transition-colors hidden group-hover:block">
              {item.category}
            </span>
            <button onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Trash2 size={10} className="text-white/20 hover:text-red-400/60 transition-colors" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function PlannerPage() {
  const [dest,       setDest]       = useState('');
  const [days,       setDays]       = useState(3);
  const [travelers,  setTravelers]  = useState(2);
  const [interests,  setInterests]  = useState<string[]>(['Heritage', 'Hidden Gems', 'Food']);
  const [language,   setLanguage]   = useState<Language>('English');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [trip,       setTrip]       = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [activeDay,  setActiveDay]  = useState(0);
  const [showWeather,setShowWeather]= useState(true); // always show when dest is set

  const toggle = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const generate = async () => {
    if (!dest.trim()) { setError('Please enter a destination.'); return; }
    setLoading(true); setTrip(null); setError('');
    try {
      const data = await apiService.generateItinerary(
        dest, days, travelers, interests, language, startDate || undefined, endDate || undefined
      );
      if (data.success && data.itinerary) {
        setTrip(data.itinerary);
        setActiveDay(0);
      } else {
        setError(data.error || 'Could not generate itinerary — please try again.');
      }
    } catch (err: any) {
      setError(
        err.message?.includes('fetch')
          ? 'Cannot reach server. Make sure the backend is running.'
          : err.message || 'Generation failed.'
      );
    } finally { setLoading(false); }
  };

  // ── PDF Download ───────────────────────────────────────────────
  const downloadPDF = () => {
    if (!trip) return;

    // Build a clean HTML string for the print window
    const allDays = trip.days || [];
    const daysHtml = allDays.map((day: any) => {
      const places = (day.places || []).map((p: any) => `
        <div class="place">
          <div class="place-header">
            <span class="place-time">${p.time || ''}</span>
            <strong class="place-name">${p.name || ''}</strong>
            ${p.duration ? `<span class="place-dur">${p.duration}</span>` : ''}
          </div>
          ${p.desc ? `<p class="place-desc">${p.desc}</p>` : ''}
          ${p.tip ? `<p class="place-tip">💡 ${p.tip.replace(/^\[[A-Z]+\]\s*/,'')}</p>` : ''}
        </div>
      `).join('');
      return `
        <div class="day-block">
          <div class="day-header">
            <span class="day-num">${day.date || 'Day ' + day.day}</span>
            <h2 class="day-title">${day.title || ''}</h2>
          </div>
          ${day.travel_tip ? `<p class="travel-tip">🗺 ${day.travel_tip}</p>` : ''}
          <div class="places">${places}</div>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vihara AI · ${trip.destination} Itinerary</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; padding: 32px 40px; max-width: 760px; margin: 0 auto; }
    .header { border-bottom: 2px solid #C9A96E; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 11px; color: #C9A96E; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
    h1 { font-size: 28px; font-weight: normal; color: #1a1a1a; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #666; display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .section { margin-bottom: 8px; }
    .section-title { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #C9A96E; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #f0e8d8; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
    .summary-item { background: #fafaf8; border: 1px solid #ede8df; border-radius: 6px; padding: 10px 12px; }
    .summary-label { font-size: 9.5px; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
    .summary-value { font-size: 12.5px; color: #333; }
    .day-block { margin-bottom: 28px; page-break-inside: avoid; }
    .day-header { background: #faf7f2; border-left: 3px solid #C9A96E; padding: 10px 14px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
    .day-num { font-size: 10px; color: #C9A96E; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 2px; }
    .day-title { font-size: 15px; font-weight: normal; color: #1a1a1a; }
    .travel-tip { font-size: 11px; color: #888; font-style: italic; margin-bottom: 10px; padding-left: 6px; }
    .place { border-bottom: 1px solid #f0ede8; padding: 10px 0; }
    .place:last-child { border-bottom: none; }
    .place-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; flex-wrap: wrap; }
    .place-time { font-size: 10.5px; color: #C9A96E; min-width: 48px; font-family: monospace; }
    .place-name { font-size: 13px; color: #1a1a1a; }
    .place-dur { font-size: 10px; color: #aaa; margin-left: auto; }
    .place-desc { font-size: 11.5px; color: #555; line-height: 1.6; margin: 3px 0 3px 58px; }
    .place-tip { font-size: 10.5px; color: #8B6914; background: #fdf7ea; border-radius: 4px; padding: 4px 8px; margin: 4px 0 0 58px; }
    .festival-alert { background: #fff8ed; border: 1px solid #f0c060; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px; color: #7a5500; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 9.5px; color: #bbb; text-align: center; letter-spacing: 0.05em; }
    @media print { body { padding: 16px 24px; } .day-block { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <p class="brand">Vihara AI · Cultural Intelligence Platform</p>
    <h1>${trip.destination} Itinerary</h1>
    <div class="meta">
      ${trip.travel_dates ? `<span>📅 ${trip.travel_dates}</span>` : `<span>⏱ ${trip.duration} Days</span>`}
      ${trip.best_season ? `<span>🌤 ${trip.best_season}</span>` : ''}
      ${trip.budget_estimate ? `<span>💰 ${trip.budget_estimate}</span>` : ''}
    </div>
  </div>

  ${trip.festival_alert ? `<div class="festival-alert">🎉 Festival Alert: ${trip.festival_alert}</div>` : ''}

  <div class="section">
    <p class="section-title">Trip Overview</p>
    <div class="summary-grid">
      <div class="summary-item"><div class="summary-label">Destination</div><div class="summary-value">${trip.destination}</div></div>
      <div class="summary-item"><div class="summary-label">Duration</div><div class="summary-value">${trip.travel_dates || trip.duration + ' days'}</div></div>
      ${trip.best_season ? `<div class="summary-item"><div class="summary-label">Best Season</div><div class="summary-value">${trip.best_season}</div></div>` : ''}
      ${trip.budget_estimate ? `<div class="summary-item"><div class="summary-label">Budget Estimate</div><div class="summary-value">${trip.budget_estimate}</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <p class="section-title">Day-by-Day Plan</p>
    ${daysHtml}
  </div>

  <div class="footer">Generated by Vihara AI · ${new Date().toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })} · vihara.ai</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      alert('Please allow popups for this site to download the PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
    // Trigger print dialog (user saves as PDF)
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  // Count all intel across entire trip
  const allPlaces  = trip?.days?.flatMap((d: any) => d.places || []) || [];
  const intelCounts = {
    timing: allPlaces.filter((p: any) => p.tip && detectType(p.tip) === 'timing').length,
    crowd:  allPlaces.filter((p: any) => p.tip && detectType(p.tip) === 'crowd').length,
    cost:   allPlaces.filter((p: any) => p.tip && detectType(p.tip) === 'cost').length,
    secret: allPlaces.filter((p: any) => p.tip && detectType(p.tip) === 'secret').length,
  };
  const totalIntel = Object.values(intelCounts).reduce((a, b) => a + b, 0);

  return (
    <PageWrapper>
      <PageHero
        label="AI Trip Intelligence"
        title={<>Smart <em className="not-italic gold-gradient">Planner</em></>}
        sub="Pick your dates — AI builds a hyperlocal itinerary with real timings, crowd windows, actual costs, and insider secrets."
        video="/videos/mountains.mp4"
        theme="sky"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Left panel ──────────────────────────────────── */}
            <div className="space-y-4">
              <div className="glass p-5 space-y-5">

                {/* Destination */}
                <div>
                  <label className="label-text mb-2 block">Destination</label>
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl glass border border-gold/15">
                    <MapPin size={14} className="text-gold shrink-0" />
                    <input
                      value={dest}
                      onChange={e => { setDest(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && generate()}
                      placeholder="Thanjavur, Hampi, Jaipur…"
                      className="bg-transparent text-white/78 text-sm outline-none w-full placeholder-white/22"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {POPULAR.map(d => (
                      <button key={d} onClick={() => { setDest(d); setError(''); }}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          dest === d ? 'bg-gold/20 border-gold/40 text-gold'
                                     : 'glass border-white/10 text-white/35 hover:text-white/60'
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <DateRangePicker
                  startDate={startDate} endDate={endDate}
                  onStartChange={setStartDate} onEndChange={setEndDate}
                  onDaysChange={setDays}
                />

                {/* Duration (manual fallback if no dates) */}
                {!startDate && (
                  <div>
                    <label className="label-text mb-2 block">Duration</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1,2,3,5,7,10].map(d => (
                        <button key={d} onClick={() => setDays(d)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                            days === d ? 'btn-gold' : 'glass text-white/38 hover:text-white/62'
                          }`}>{d}d</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Travelers */}
                <div>
                  <label className="label-text mb-2 block">Travelers</label>
                  <div className="glass flex items-center gap-3 px-4 py-3 rounded-xl">
                    <Users size={14} className="text-white/28" />
                    <span className="text-white/48 text-sm flex-1">
                      {travelers === 1 ? 'Solo' : travelers === 2 ? 'Couple' : `${travelers} people`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setTravelers(t => Math.max(1, t - 1))}
                        className="w-7 h-7 rounded-lg glass flex items-center justify-center text-white/45 hover:text-white">−</button>
                      <span className="text-white/75 text-sm w-4 text-center">{travelers}</span>
                      <button onClick={() => setTravelers(t => Math.min(20, t + 1))}
                        className="w-7 h-7 rounded-lg glass flex items-center justify-center text-white/45 hover:text-white">+</button>
                    </div>
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="label-text mb-2.5 block">Interests</label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTERESTS.map(i => (
                      <button key={i} onClick={() => toggle(i)}
                        className={`mode-pill text-[11.5px] ${interests.includes(i) ? 'active' : ''}`}>{i}</button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="label-text mb-2 block">Language</label>
                  <LanguagePicker value={language} onChange={setLanguage} />
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-red-500/6 border border-red-500/14">
                    <AlertCircle size={13} className="text-red-400/60 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-red-400/65 leading-relaxed">{error}</span>
                  </motion.div>
                )}

                <motion.button onClick={generate} disabled={loading || !dest.trim()}
                  className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-sm disabled:opacity-45"
                  whileHover={!loading && dest ? { scale: 1.02 } : {}}
                  whileTap={!loading && dest ? { scale: 0.97 } : {}}>
                  {loading
                    ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}><Compass size={16} /></motion.div> Building…</>
                    : <><Compass size={16} /> Generate Itinerary</>}
                </motion.button>
              </div>

              {/* Live weather */}
              <AnimatePresence>
                {showWeather && dest && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <WeatherWidget city={dest} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Todo List / Trip Checklist */}
              <TodoList destination={dest} />

              {/* Trip summary */}
              {trip && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass p-4 space-y-2.5">
                  <p className="label-text">Trip Summary</p>
                  {[
                    { l: 'Destination', v: trip.destination },
                    { l: 'Dates',       v: trip.travel_dates || `${trip.duration} days` },
                    { l: 'Best Season', v: trip.best_season },
                    { l: 'Budget',      v: trip.budget_estimate },
                    { l: 'Places',      v: `${allPlaces.length} stops across ${trip.duration} days` },
                  ].filter(s => s.v).map(s => (
                    <div key={s.l} className="flex justify-between text-xs gap-2">
                      <span className="text-white/30 shrink-0">{s.l}</span>
                      <span className="text-white/60 text-right leading-tight">{s.v}</span>
                    </div>
                  ))}

                  {/* Festival alert */}
                  {trip.festival_alert && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-500/8 rounded-xl border border-amber-400/20 mt-1">
                      <Flame size={11} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-300/80 leading-relaxed">{trip.festival_alert}</p>
                    </div>
                  )}

                  {/* Intel summary */}
                  {totalIntel > 0 && (
                    <>
                      <div className="h-px bg-white/6" />
                      <p className="text-[10px] text-gold/50 uppercase tracking-wider">Intelligence Layer</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.entries(intelCounts) as [IntelType, number][])
                          .filter(([, n]) => n > 0)
                          .map(([type, n]) => {
                            const cfg = INTEL_CONFIG[type];
                            const Icon = cfg.Icon;
                            return (
                              <div key={type} className={`flex items-center gap-1.5 p-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                                <Icon size={10} style={{ color: cfg.color }} />
                                <span className="text-[10px]" style={{ color: `${cfg.color}90` }}>
                                  {n} {cfg.label.split(' ')[0].toLowerCase()}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}

                  {dest && (
                    <div className="flex gap-2 mt-1">
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(dest + ' India tourist places')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                          glass text-white/40 text-xs hover:text-white/70 transition-all border border-white/8">
                        <Map size={11} /> Maps
                      </a>
                      <motion.button
                        onClick={downloadPDF}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                          bg-gold/10 border border-gold/25 text-gold/80 text-xs hover:bg-gold/20 transition-all"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        title="Download itinerary as PDF"
                      >
                        <Download size={11} /> Download PDF
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── Right: itinerary ──────────────────────────────── */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">

                {/* Empty state */}
                {!trip && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full glass flex items-center justify-center mb-5 animate-float">
                      <Calendar size={28} className="text-white/14" />
                    </div>
                    <p className="text-white/22 text-sm">Pick dates + destination, then tap Generate</p>
                    <p className="text-white/12 text-xs mt-1">
                      Real temple timings · crowd windows · actual entry costs · insider secrets
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-8 w-full max-w-xs">
                      {[
                        { Icon: ShieldAlert,  color: '#E8A87C', t: '"Closed 12:30–4 PM. Arrive before 8 AM."' },
                        { Icon: TrendingDown, color: '#8B9DC3', t: '"Tuesday 7 AM — 30 visitors not 3,000."' },
                        { Icon: IndianRupee,  color: '#9BC38B', t: '"Entry ₹50. Auto ₹40 not ₹200."' },
                        { Icon: Eye,          color: '#C9A96E', t: '"The carving 95% of visitors walk past."' },
                      ].map(({ Icon, color, t }) => (
                        <div key={t} className="glass p-3 rounded-xl flex items-start gap-2">
                          <Icon size={12} style={{ color }} className="shrink-0 mt-0.5" />
                          <p className="text-white/30 text-[10px] leading-snug italic">{t}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 gap-5">
                    <motion.div
                      className="w-16 h-16 rounded-full border border-gold/25 flex items-center justify-center"
                      animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}>
                      <div className="w-10 h-10 rounded-full border-t border-gold" />
                    </motion.div>
                    <div className="text-center">
                      <p className="font-display text-xl text-white mb-1">Building your plan for {dest}</p>
                      <p className="text-white/30 text-sm">Gathering temple timings, crowd data, local costs…</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {['Temple Timings','Crowd Windows','Real Costs','Hidden Gems','Festival Check'].map((s, i) => (
                        <motion.span key={s}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
                          className="text-[11px] px-3 py-1 glass text-white/40 rounded-full border border-white/8">{s}</motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Trip result */}
                {trip && !loading && (
                  <motion.div key="trip" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-4">

                    {/* Overview */}
                    {trip.overview && (
                      <div className="glass p-4 border border-gold/10">
                        <p className="label-text mb-1.5">{trip.destination}
                          {trip.travel_dates && trip.travel_dates !== ' to ' && (
                            <span className="text-white/30 font-normal ml-2 text-[10px]">· {trip.travel_dates}</span>
                          )}
                        </p>
                        <p className="text-white/62 text-sm leading-relaxed">{trip.overview}</p>
                      </div>
                    )}

                    {/* Global intel strip */}
                    {totalIntel > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-0.5">
                        {(Object.entries(intelCounts) as [IntelType, number][])
                          .filter(([, n]) => n > 0)
                          .map(([type, n]) => {
                            const cfg = INTEL_CONFIG[type];
                            const Icon = cfg.Icon;
                            return (
                              <div key={type}
                                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                                <Icon size={10} style={{ color: cfg.color }} />
                                <span className="text-[10px]" style={{ color: cfg.color }}>
                                  {n} {cfg.label}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* PDF Download in right panel header */}
                <motion.button
                  onClick={downloadPDF}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                    bg-gold/10 border border-gold/20 text-gold/75 text-[11px]
                    hover:bg-gold/18 hover:text-gold transition-all self-start mb-3"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                >
                  <Download size={11} /> Download PDF
                </motion.button>

                {/* Day tabs — with warning dot */}
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {trip.days?.map((d: any, i: number) => {
                        const hasWarning = (d.places || []).some((p: any) =>
                          p.tip && detectType(p.tip) === 'timing'
                        );
                        return (
                          <button key={i} onClick={() => setActiveDay(i)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                              activeDay === i ? 'btn-gold' : 'glass text-white/38 hover:text-white/62'
                            }`}>
                            Day {d.day}
                            {hasWarning && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">!</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {trip.days?.[activeDay] && (
                        <DayPanel key={activeDay} day={trip.days[activeDay]} dest={trip.destination} />
                      )}
                    </AnimatePresence>

                    {/* Cultural notes */}
                    {trip.cultural_notes && (
                      <div className="glass p-4">
                        <p className="label-text mb-2">Cultural Rules & Etiquette</p>
                        <p className="text-white/52 text-sm leading-relaxed">{trip.cultural_notes}</p>
                      </div>
                    )}

                    {/* Hidden gems + packing */}
                    {(trip.hidden_gems?.length || trip.packing_tips?.length) && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {trip.hidden_gems?.length > 0 && (
                          <div className="glass p-4">
                            <p className="label-text mb-3">Hidden Gems Nearby</p>
                            {trip.hidden_gems.map((g: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 py-1.5">
                                <div className="w-1 h-1 rounded-full bg-gold/35 shrink-0 mt-2" />
                                <p className="text-[11px] text-white/48 leading-relaxed">{g}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {trip.packing_tips?.length > 0 && (
                          <div className="glass p-4">
                            <p className="label-text mb-3">What to Carry</p>
                            {trip.packing_tips.map((t: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 py-1.5">
                                <div className="w-1 h-1 rounded-full bg-gold/35 shrink-0 mt-2" />
                                <p className="text-[11px] text-white/48 leading-relaxed">{t}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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

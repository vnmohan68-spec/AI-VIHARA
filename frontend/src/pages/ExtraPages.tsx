import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, MapPin, Trash2, User, Bell, Globe,
  Shield, LogOut, Moon, Volume2, ChevronRight, Loader, AlertCircle
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageHero from '../components/layout/PageHero';
import { GoldDivider } from '../components/ui/GoldDivider';
import { AuthModal } from '../components/ui/AuthModal';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { formatDate } from '../utils/format';

/* ══ SAVED PAGE ══════════════════════════════════════════════════ */
interface SavedPlace { id: string; name: string; location: string; type?: string; note?: string; saved_at: string; }

export function SavedPage() {
  const [places,   setPlaces]   = useState<SavedPlace[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    apiService.getSavedPlaces()
      .then((d: any) => setPlaces(Array.isArray(d) ? d : []))
      .catch((e: any) => setError(
        e.message?.includes('401') ? 'Sign in to view saved places.'
          : e.message?.includes('fetch') ? 'Cannot reach server.'
          : 'Failed to load saved places.'
      ))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    setRemoving(id);
    try { await apiService.unsavePlace(id); setPlaces(p => p.filter(x => x.id !== id)); }
    catch { /* silent */ } finally { setRemoving(null); }
  };

  return (
    <PageWrapper>
      <PageHero
        label="Collection"
        title={<>Saved <em className="not-italic gold-gradient">Places</em></>}
        video="/videos/beach.mp4"
        theme="ocean"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-3xl mx-auto">

          {loading && (
            <div className="flex items-center justify-center py-20 gap-2.5">
              <Loader size={18} className="text-gold/45 animate-spin" />
              <span className="text-white/28 text-sm">Loading your collection…</span>
            </div>
          )}
          {error && !loading && (
            <div className="glass p-5 flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400/55 shrink-0 mt-0.5" />
              <p className="text-sm text-white/38">{error}</p>
            </div>
          )}
          {!loading && !error && places.length === 0 && (
            <div className="text-center py-20">
              <Bookmark size={36} className="mx-auto mb-4 text-white/10" />
              <p className="text-white/22 text-sm">No saved places yet.</p>
              <p className="text-white/12 text-xs mt-1">Scan a monument or explore gems and tap Save.</p>
            </div>
          )}
          {!loading && !error && places.length > 0 && (
            <div className="space-y-2.5">
              <AnimatePresence>
                {places.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -18 }} transition={{ delay: i * 0.055 }}
                    className="glass p-4 flex items-center gap-4 group"
                    whileHover={{ borderColor: 'rgba(201,169,110,0.17)' }}
                  >
                    <div className="w-11 h-11 rounded-xl glass-gold flex items-center justify-center shrink-0">
                      <Bookmark size={17} className="text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/75 text-sm font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin size={9} className="text-gold/42 shrink-0" />
                        <span className="text-[11.5px] text-white/32 truncate">{p.location}</span>
                        {p.saved_at && (
                          <span className="text-[10.5px] text-white/18 shrink-0">· {formatDate(p.saved_at)}</span>
                        )}
                      </div>
                      {p.note && <p className="text-[11px] text-white/22 mt-0.5 truncate italic">{p.note}</p>}
                    </div>
                    {p.type && (
                      <span className="text-[10.5px] px-2 py-0.5 glass text-white/25 rounded-full shrink-0 hidden sm:block">{p.type}</span>
                    )}
                    <button onClick={() => remove(p.id)} disabled={removing === p.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/8 shrink-0">
                      {removing === p.id
                        ? <Loader size={12} className="text-white/22 animate-spin" />
                        : <Trash2 size={12} className="text-white/22 hover:text-red-400 transition-colors" />
                      }
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

/* ══ PROFILE PAGE ════════════════════════════════════════════════ */
export function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const [saved,     setSaved]     = useState<number | null>(null);
  const [authOpen,  setAuthOpen]  = useState(false);
  const [authTab,   setAuthTab]   = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (isAuthenticated) {
      apiService.getSavedPlaces()
        .then((d: any) => setSaved(Array.isArray(d) ? d.length : 0))
        .catch(() => setSaved(0));
    }
  }, [isAuthenticated]);

  const initial  = user?.name?.[0]?.toUpperCase() || 'G';
  const joinDate = (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <PageWrapper>
      <PageHero
        label="Account"
        title="Profile"
        video="/videos/city.mp4"
        theme="dusk"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Avatar card */}
          <div className="glass p-7 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full glass-gold flex items-center justify-center mb-4 text-3xl font-display text-gold select-none">
              {initial}
            </div>
            {isAuthenticated && user ? (
              <>
                <p className="font-display text-2xl text-white mb-0.5">{user.name}</p>
                <p className="text-sm text-white/35 mb-1">{user.email}</p>
                {joinDate && <p className="text-[11px] text-white/18">Member since {joinDate}</p>}
              </>
            ) : (
              <>
                <p className="font-display text-2xl text-white mb-0.5">Guest Explorer</p>
                <p className="text-sm text-white/35">Sign in to unlock full features</p>
              </>
            )}

            <div className="flex gap-3 mt-5 w-full max-w-xs">
              {[
                { label: 'Saved',  value: saved !== null ? saved : '—' },
                { label: 'Trips',  value: '—' },
                { label: 'Gems',   value: '—' },
              ].map(s => (
                <div key={s.label} className="flex-1 glass p-3 rounded-xl text-center">
                  <p className="font-display text-xl gold-gradient">{s.value}</p>
                  <p className="text-[10.5px] text-white/25 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="flex gap-3 mt-5 w-full max-w-xs">
                <button
                  onClick={() => { setAuthTab('login'); setAuthOpen(true); }}
                  className="flex-1 btn-gold py-2.5 rounded-xl text-sm font-medium"
                >Sign In</button>
                <button
                  onClick={() => { setAuthTab('register'); setAuthOpen(true); }}
                  className="flex-1 btn-glass py-2.5 rounded-xl text-sm font-medium"
                >Register</button>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="glass">
            <div className="px-5 py-4 border-b border-white/[0.055]">
              <p className="label-text">Account Details</p>
            </div>
            {[
              { label: 'Name',     value: user?.name     || 'Guest' },
              { label: 'Email',    value: user?.email    || 'Not signed in' },
              { label: 'Language', value: (user as any)?.language || 'English' },
            ].map(item => (
              <div key={item.label} className="flex justify-between px-5 py-3.5 border-b border-white/[0.045] last:border-0">
                <span className="text-sm text-white/32">{item.label}</span>
                <span className="text-sm text-white/58">{item.value}</span>
              </div>
            ))}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => { logout(); window.location.href = '/'; }}
              className="w-full btn-glass py-3 rounded-xl text-sm flex items-center justify-center gap-2 text-red-400/55 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </PageWrapper>
  );
}

/* ══ SETTINGS PAGE ═══════════════════════════════════════════════ */
type ToggleKey = 'darkMode' | 'notifications' | 'newGems';
interface SettingsState { darkMode: boolean; notifications: boolean; newGems: boolean; language: string; voiceSpeed: string; }

export function SettingsPage() {
  const [cfg, setCfg] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('vihara_settings');
      return saved ? { ...{ darkMode: true, notifications: true, newGems: false, language: 'English', voiceSpeed: 'Normal' }, ...JSON.parse(saved) }
        : { darkMode: true, notifications: true, newGems: false, language: 'English', voiceSpeed: 'Normal' };
    } catch { return { darkMode: true, notifications: true, newGems: false, language: 'English', voiceSpeed: 'Normal' }; }
  });

  // Persist settings whenever they change
  useEffect(() => {
    try { localStorage.setItem('vihara_settings', JSON.stringify(cfg)); } catch {}
  }, [cfg]);

  const toggle = (k: ToggleKey) => setCfg(p => ({ ...p, [k]: !p[k] }));

  const sections = [
    {
      title: 'Preferences', items: [
        { icon: Globe,   label: 'Default Language', type: 'select', key: 'language',   options: ['English','Hindi','Telugu','Tamil','Bengali','Kannada'] },
        { icon: Volume2, label: 'Voice Speed',       type: 'select', key: 'voiceSpeed', options: ['Slow','Normal','Fast'] },
        { icon: Moon,    label: 'Dark Mode',         type: 'toggle', toggleKey: 'darkMode' as ToggleKey },
      ],
    },
    {
      title: 'Notifications', items: [
        { icon: Bell, label: 'Trip Reminders',    type: 'toggle', toggleKey: 'notifications' as ToggleKey },
        { icon: Bell, label: 'New Gems Nearby',   type: 'toggle', toggleKey: 'newGems' as ToggleKey },
      ],
    },
    {
      title: 'Account', items: [
        { icon: Shield,  label: 'Privacy Settings', type: 'link' },
        { icon: LogOut,  label: 'Sign Out',          type: 'action', danger: true },
      ],
    },
  ];

  return (
    <PageWrapper>
      <PageHero
        label="Configuration"
        title="Settings"
        video="/videos/mountains.mp4"
        theme="sky"
      />
      <div className="min-h-screen px-4 md:px-10 pb-12 pt-6">
        <div className="max-w-2xl mx-auto">

          <div className="space-y-5">
            {sections.map((sec, si) => (
              <motion.div key={sec.title}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.08 }}
                className="glass overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-white/[0.055]">
                  <p className="label-text">{sec.title}</p>
                </div>
                {sec.items.map((item: any) => (
                  <div key={item.label}
                    className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon size={14} className={item.danger ? 'text-red-400/50' : 'text-white/26'} />
                      <span className={`text-sm ${item.danger ? 'text-red-400/58' : 'text-white/62'}`}>{item.label}</span>
                    </div>
                    {item.type === 'toggle' && (
                      <button onClick={() => item.toggleKey && toggle(item.toggleKey)}
                        className={`w-10 h-5 rounded-full transition-all relative ${
                          (cfg as any)[item.toggleKey] ? 'bg-gold' : 'bg-white/10'
                        }`}
                        aria-label={`Toggle ${item.label}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
                          (cfg as any)[item.toggleKey] ? 'translate-x-5' : 'translate-x-[3px]'
                        }`} />
                      </button>
                    )}
                    {item.type === 'select' && (
                      <select
                        value={(cfg as any)[item.key]}
                        onChange={e => setCfg(p => ({ ...p, [item.key]: e.target.value }))}
                        className="bg-transparent text-white/38 text-xs outline-none cursor-pointer"
                      >
                        {item.options?.map((o: string) => (
                          <option key={o} value={o} style={{ background: '#111' }}>{o}</option>
                        ))}
                      </select>
                    )}
                    {(item.type === 'link' || item.type === 'action') && (
                      <ChevronRight size={13} className="text-white/18" />
                    )}
                  </div>
                ))}
              </motion.div>
            ))}
          </div>

          <div className="mt-7 text-center space-y-1">
            <p className="text-[10.5px] text-white/15">Vihara AI v2.0.0 · Cultural Intelligence Platform</p>
            <p className="text-[10px] text-white/10">Groq · Llama Vision · Whisper</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default SavedPage;

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MessageSquare, Mic, Map, Gem, BookOpen, Bookmark, User, Settings, Menu, X, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AuthModal } from '../ui/AuthModal';

const NAV_ITEMS = [
  { path: '/scan',    icon: Camera,         label: 'Scanner'  },
  { path: '/chat',    icon: MessageSquare,  label: 'Guide'    },
  { path: '/voice',   icon: Mic,            label: 'Voice'    },
  { path: '/plan',    icon: Map,            label: 'Planner'  },
  { path: '/gems',    icon: Gem,            label: 'Gems'     },
  { path: '/culture', icon: BookOpen,       label: 'Culture'  },
  { path: '/witness', icon: Eye,            label: 'Witness'  },
];
const NAV_USER = [
  { path: '/saved',    icon: Bookmark, label: 'Saved'    },
  { path: '/profile',  icon: User,     label: 'Profile'  },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [authOpen,    setAuthOpen]    = useState(false);
  const [authTab,     setAuthTab]     = useState<'login' | 'register'>('login');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const openLogin    = () => { setAuthTab('login');    setAuthOpen(true); };
  const openRegister = () => { setAuthTab('register'); setAuthOpen(true); };

  const initial = user?.name?.[0]?.toUpperCase() || '?';

  return (
    <>
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ${
          scrolled ? 'glass-dark border-b border-white/[0.06]' : 'bg-transparent'
        }`}
        style={{ height: 62 }}
      >
        <div className="flex items-center justify-between h-full px-5 md:px-8 max-w-screen-xl mx-auto">

          {/* Logo */}
          <Link to="/" className="flex flex-col leading-none select-none" aria-label="Vihara AI home">
            <span className="font-display text-[1.18rem] gold-gradient leading-none">Vihara AI</span>
            <span className="label-text mt-0.5" style={{ fontSize: '8.5px' }}>Cultural Intelligence</span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const active = pathname === path;
              return (
                <Link key={path} to={path}>
                  <motion.span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] transition-colors cursor-pointer select-none ${
                      active
                        ? 'bg-gold/10 border border-gold/20 text-gold-light'
                        : 'text-white/42 hover:text-white/72 hover:bg-white/[0.04]'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon size={14} />
                    {label}
                  </motion.span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop right: auth or user icons */}
          <div className="hidden md:flex items-center gap-1.5" aria-label="User actions">
            {isAuthenticated ? (
              <>
                {NAV_USER.map(({ path, icon: Icon, label }) => {
                  const active = pathname === path;
                  return (
                    <Link key={path} to={path} title={label}>
                      <motion.span
                        className={`p-2 rounded-xl transition-colors cursor-pointer block ${
                          active ? 'glass-gold' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <Icon size={15} className={active ? 'text-gold' : ''} />
                      </motion.span>
                    </Link>
                  );
                })}
                {/* User avatar + logout */}
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/[0.08]">
                  <div className="w-7 h-7 rounded-full glass-gold flex items-center justify-center text-[11px] font-medium text-gold select-none">
                    {initial}
                  </div>
                  <button
                    onClick={logout}
                    title="Sign out"
                    className="p-1.5 rounded-lg text-white/22 hover:text-red-400/70 hover:bg-white/[0.04] transition-colors"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={openLogin}
                  className="px-3.5 py-1.5 rounded-xl text-[13px] text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                  whileTap={{ scale: 0.96 }}
                >
                  Sign In
                </motion.button>
                <motion.button
                  onClick={openRegister}
                  className="btn-gold px-4 py-1.5 rounded-xl text-[13px]"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Register
                </motion.button>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-xl glass text-white/55 hover:text-white/80 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="fixed top-[62px] inset-x-0 z-40 glass-dark border-b border-white/[0.06] p-4 md:hidden"
            >
              <div className="grid grid-cols-3 gap-2">
                {[...NAV_ITEMS, ...NAV_USER].map(({ path, icon: Icon, label }) => {
                  const active = pathname === path;
                  return (
                    <Link key={path} to={path}>
                      <motion.div
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors cursor-pointer ${
                          active ? 'glass-gold' : 'glass hover:bg-white/[0.06]'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon size={18} className={active ? 'text-gold' : 'text-white/38'} />
                        <span className={`text-[11px] ${active ? 'text-gold' : 'text-white/30'}`}>{label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile auth */}
              {!isAuthenticated ? (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <button onClick={openLogin}    className="flex-1 btn-glass py-2.5 rounded-xl text-sm">Sign In</button>
                  <button onClick={openRegister} className="flex-1 btn-gold  py-2.5 rounded-xl text-sm">Register</button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full glass-gold flex items-center justify-center text-xs font-medium text-gold">{initial}</div>
                    <span className="text-sm text-white/45">{user?.name}</span>
                  </div>
                  <button onClick={logout} className="text-xs text-red-400/55 hover:text-red-400 flex items-center gap-1.5 transition-colors">
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </>
  );
}

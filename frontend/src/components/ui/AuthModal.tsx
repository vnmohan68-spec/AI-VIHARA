import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: Props) {
  const { login, register, loading, error, clearError } = useAuth();

  const [tab,      setTab]      = useState<'login' | 'register'>(defaultTab);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [success,  setSuccess]  = useState('');
  const [localErr, setLocalErr] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);

  // Reset on open/tab change
  useEffect(() => {
    if (isOpen) {
      setName(''); setEmail(''); setPassword('');
      setSuccess(''); setLocalErr(''); setShowPw(false);
      clearError();
      setTimeout(() => emailRef.current?.focus(), 120);
    }
  }, [isOpen, tab]);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const displayError = localErr || error;

  const validate = (): string => {
    if (tab === 'register' && name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!email.includes('@') || !email.includes('.')) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const handleSubmit = async () => {
    setLocalErr(''); clearError();
    const err = validate();
    if (err) { setLocalErr(err); return; }

    setBusy(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
        setSuccess('Welcome back!');
        setTimeout(onClose, 800);
      } else {
        await register(name.trim(), email.trim(), password);
        setSuccess('Account created! Welcome to Vihara.');
        setTimeout(onClose, 800);
      }
    } catch {
      // error is set in useAuth context
    } finally {
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleSubmit();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-full max-w-sm glass-dark rounded-2xl border border-white/[0.09] overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,169,110,0.08)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <p className="label-text mb-1">Vihara AI</p>
                  <h2 className="font-display text-xl text-white">
                    {tab === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex mx-6 mb-5 glass rounded-xl p-0.5">
                {(['login', 'register'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); clearError(); setLocalErr(''); setSuccess(''); }}
                    className={`flex-1 py-2 rounded-[10px] text-xs font-medium transition-all ${
                      tab === t
                        ? 'bg-gold/15 text-gold border border-gold/25'
                        : 'text-white/35 hover:text-white/55'
                    }`}
                  >
                    {t === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <div className="px-6 pb-6 space-y-3">

                {/* Success */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2.5 p-3 glass rounded-xl border border-green-500/20"
                    >
                      <CheckCircle size={14} className="text-green-400 shrink-0" />
                      <p className="text-sm text-green-400">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {displayError && !success && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2.5 p-3 glass rounded-xl border border-red-500/20"
                    >
                      <AlertCircle size={14} className="text-red-400/80 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400/80">{displayError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name (register only) */}
                <AnimatePresence>
                  {tab === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                    >
                      <label className="block text-[11px] text-white/35 mb-1.5 ml-1">Full Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onKeyDown={handleKey}
                          placeholder="Your name"
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-gold/35 focus:bg-white/[0.07] transition-all"
                          autoComplete="name"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div>
                  <label className="block text-[11px] text-white/35 mb-1.5 ml-1">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="you@example.com"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-gold/35 focus:bg-white/[0.07] transition-all"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] text-white/35 mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={tab === 'register' ? 'Min 6 characters' : 'Your password'}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-gold/35 focus:bg-white/[0.07] transition-all"
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors p-1"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={busy || !!success}
                  className="w-full btn-gold py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={!busy ? { scale: 1.01 } : {}}
                  whileTap={!busy ? { scale: 0.98 } : {}}
                >
                  {busy
                    ? <><Loader size={14} className="animate-spin" /> {tab === 'login' ? 'Signing in…' : 'Creating account…'}</>
                    : tab === 'login' ? 'Sign In' : 'Create Account'
                  }
                </motion.button>

                {/* Switch tab link */}
                <p className="text-center text-[12px] text-white/28 pt-1">
                  {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); clearError(); setLocalErr(''); setSuccess(''); }}
                    className="text-gold/70 hover:text-gold transition-colors underline-offset-2 hover:underline"
                  >
                    {tab === 'login' ? 'Register' : 'Sign In'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

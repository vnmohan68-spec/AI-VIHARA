import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

type Status = 'loading' | 'error' | 'success';

interface Props {
  status: Status;
  message?: string;
  className?: string;
}

export function StatusBadge({ status, message, className = '' }: Props) {
  if (status === 'loading') return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader size={15} className="text-gold/60 animate-spin" />
      {message && <span className="text-sm text-white/40">{message}</span>}
    </div>
  );

  if (status === 'error') return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2 p-3 rounded-xl bg-red-500/6 border border-red-500/15 ${className}`}
    >
      <AlertCircle size={14} className="text-red-400/60 shrink-0 mt-0.5" />
      <span className="text-xs text-red-400/70 leading-relaxed">{message}</span>
    </motion.div>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CheckCircle size={15} className="text-green-400/60" />
      {message && <span className="text-sm text-white/50">{message}</span>}
    </div>
  );
}

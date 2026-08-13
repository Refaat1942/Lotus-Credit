import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import LotusLogo from './LotusLogo';

interface HeaderProps {
  online: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Header({ online, onRefresh, loading }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <LotusLogo size="sm" animate />
          <div>
            <h1 className="text-xl font-bold gradient-text">لوتس كريدت</h1>
            <p className="text-xs text-slate-400">Lotus Credit · شروط صرف التعاقدات</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: online ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: online ? Infinity : 0, duration: 2 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              online
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {online ? 'متصل' : 'بدون إنترنت'}
          </motion.div>

          {onRefresh && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
          )}

          <Link to="/admin">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
              title="لوحة الإدارة"
            >
              <Settings className="w-5 h-5 text-slate-300" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

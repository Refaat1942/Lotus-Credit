import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Settings, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import LotusLogo from './LotusLogo';
import { useBranding } from '../hooks/useBranding';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  online: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Header({ online, onRefresh, loading }: HeaderProps) {
  const branding = useBranding();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-theme"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          <LotusLogo size="sm" animate />
          <div className="min-w-0 leading-tight">
            <h1 className="text-lg sm:text-xl font-bold gradient-text">
              {branding.titleAr}
            </h1>
            <p className="text-sm font-semibold text-primary">
              {branding.departmentAr}
            </p>
            <p className="text-[11px] text-muted hidden sm:block">
              {branding.subtitleAr}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
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
            <span className="hidden sm:inline">{online ? 'متصل' : 'بدون إنترنت'}</span>
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

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-lotus-600" />
            )}
          </motion.button>

          <Link to="/admin" state={{ requireLogin: true }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
              title="لوحة الإدارة"
            >
              <Settings className="w-5 h-5 text-muted" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

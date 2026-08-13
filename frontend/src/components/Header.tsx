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
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass border-b border-theme"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 group min-w-0">
          <LotusLogo size="sm" />
          <div className="min-w-0 leading-snug border-r border-theme pr-2.5">
            <p className="text-sm sm:text-[15px] font-bold text-primary truncate">
              {branding.titleAr}
            </p>
            <p className="text-xs font-medium text-lotus-600 dark:text-lotus-400 truncate">
              {branding.departmentAr}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
              online
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'متصل' : 'أوفلاين'}
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
            title={theme === 'dark' ? 'وضع فاتح' : 'وضع داكن'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-lotus-600" />
            )}
          </button>

          <Link to="/admin" state={{ requireLogin: true }}>
            <button className="p-2 rounded-lg hover:bg-surface transition-colors" title="إدارة">
              <Settings className="w-4 h-4 text-muted" />
            </button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

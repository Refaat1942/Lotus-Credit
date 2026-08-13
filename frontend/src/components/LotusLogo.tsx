import { useState } from 'react';
import { motion } from 'framer-motion';
import { useBranding } from '../hooks/useBranding';

type LotusLogoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<LotusLogoSize, string> = {
  sm: 'h-11 w-auto max-w-[120px]',
  md: 'h-16 w-auto max-w-[160px]',
  lg: 'h-28 w-auto max-w-[220px] sm:h-32',
};

interface LotusLogoProps {
  size?: LotusLogoSize;
  className?: string;
  animate?: boolean;
  logoUrl?: string;
}

export default function LotusLogo({
  size = 'md',
  className = '',
  animate = false,
  logoUrl: logoUrlProp,
}: LotusLogoProps) {
  const branding = useBranding();
  const logoUrl = logoUrlProp || branding.logoUrl || '/lotus-logo.png';
  const [failed, setFailed] = useState(false);

  const img = failed ? (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-3 ${className}`}
    >
      <span className="text-xs text-center text-lotus-300 font-bold leading-tight">
        {branding.titleAr}
      </span>
    </div>
  ) : (
    <img
      src={logoUrl}
      alt={branding.titleAr}
      className={`${sizeClasses[size]} object-contain object-center ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );

  if (!animate) return img;

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {img}
    </motion.div>
  );
}

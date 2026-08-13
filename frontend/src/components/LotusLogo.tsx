import { motion } from 'framer-motion';

type LotusLogoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<LotusLogoSize, string> = {
  sm: 'h-10 w-auto',
  md: 'h-14 w-auto',
  lg: 'h-24 w-auto sm:h-28',
};

interface LotusLogoProps {
  size?: LotusLogoSize;
  className?: string;
  animate?: boolean;
}

export default function LotusLogo({ size = 'md', className = '', animate = false }: LotusLogoProps) {
  const img = (
    <img
      src="/lotus-logo.png"
      alt="صيدليات لوتس - Lotus Pharmacies"
      className={`${sizeClasses[size]} object-contain object-center ${className}`}
      draggable={false}
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

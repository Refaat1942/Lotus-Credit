import { useState } from 'react';
import type { Company } from '../types';

interface CompanyLogoProps {
  company: Pick<Company, 'nameAr' | 'logoUrl' | 'color' | 'icon'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-11 h-11 rounded-lg',
  md: 'w-16 h-16 rounded-xl',
  lg: 'w-[4.5rem] h-[4.5rem] rounded-xl',
};

export default function CompanyLogo({ company, size = 'md', className = '' }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const box = sizes[size];

  if (company.logoUrl && !failed) {
    return (
      <div
        className={`${box} flex items-center justify-center bg-white border border-theme overflow-hidden shrink-0 ${className}`}
      >
        <img
          src={company.logoUrl}
          alt={company.nameAr}
          className="max-w-[85%] max-h-[85%] object-contain"
          draggable={false}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const initial = (company.nameAr || '?').trim().charAt(0);
  const color = company.color || '#14b8a6';

  return (
    <div
      className={`${box} flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    >
      {initial}
    </div>
  );
}

import { motion } from 'framer-motion';
import { Phone, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Company } from '../types';
import CompanyLogo from './CompanyLogo';
import { galleryMediaCount } from '../utils/mediaFilters';
import { useLanguage } from '../context/LanguageContext';

interface CompanyCardProps {
  company: Company;
  index: number;
}

export default function CompanyCard({ company, index }: CompanyCardProps) {
  const { lang } = useLanguage();
  const color = company.color || '#14b8a6';
  const mediaCount = galleryMediaCount(company.media);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link to={`/company/${company.id}`} className="block">
        <div className="glass-card p-5 h-full relative overflow-hidden group">
          <div
            className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
          />

          <div className="flex items-start justify-between gap-2 mb-4">
            <CompanyLogo company={company} size="md" />
            {company.hotline && (
              <span className="flex items-center gap-1 text-sm text-muted bg-surface px-2.5 py-1 rounded-lg shrink-0">
                <Phone className="w-3.5 h-3.5" />
                {company.hotline}
              </span>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-primary mb-0.5">
            {lang === 'en' ? company.nameEn : company.nameAr}
          </h3>
          <p className="text-sm text-muted mb-3">
            {lang === 'en' ? company.nameAr : company.nameEn}
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {company.approvalSystem && (
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-lotus-500/15 text-lotus-600 dark:text-lotus-300">
                {company.approvalSystem}
              </span>
            )}
            {mediaCount > 0 && (
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-surface text-muted">
                {mediaCount} {lang === 'en' ? 'cards/photos' : 'بطاقة/صورة'}
              </span>
            )}
            {company.links && company.links.length > 0 && (
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-surface text-muted">
                {company.links.length} {lang === 'en' ? 'links' : 'رابط'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-theme">
            <span className="text-sm text-muted">
              {company.forms?.length || 0} {lang === 'en' ? 'dispensing methods' : 'طرق صرف'}
            </span>
            <span className="flex items-center gap-1 text-sm text-lotus-600 dark:text-lotus-400 group-hover:text-lotus-500">
              {lang === 'en' ? 'Details' : 'التفاصيل'}
              <Chevron className="w-4 h-4" />
            </span>
          </div>

          {company.approvalPortal && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted truncate">
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{company.approvalPortal.replace('https://', '')}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

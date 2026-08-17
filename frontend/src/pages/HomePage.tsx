import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import Header from '../components/Header';
import CompanyCard from '../components/CompanyCard';
import QuickReferencePanel from '../components/QuickReferencePanel';
import { useRules } from '../hooks/useRules';
import { useBranding } from '../hooks/useBranding';
import { useLanguage } from '../context/LanguageContext';
import { uiText } from '../data/uiStrings';

export default function HomePage() {
  const { data, loading, online, error, refetch } = useRules();
  const branding = useBranding();
  const { lang } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!data?.companies) return [];
    const q = search.trim().toLowerCase();
    if (!q) return [...data.companies].sort((a, b) => a.order - b.order);
    return data.companies.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.approvalSystem?.toLowerCase().includes(q) ||
        c.hotline?.includes(q)
    );
  }, [data, search]);

  const heroBadge = lang === 'en'
    ? (branding.heroBadgeEn || branding.subtitleEn || branding.subtitleAr)
    : (branding.heroBadgeAr || branding.subtitleAr);
  const heroTitle = lang === 'en'
    ? (branding.heroTitleEn || branding.titleEn || 'Dispensing Contracts Guide')
    : branding.heroTitleAr;
  const heroSubtitle = lang === 'en'
    ? (branding.heroSubtitleEn || 'Everything you need to dispense insurance prescriptions quickly and accurately — no login required')
    : branding.heroSubtitleAr;

  return (
    <div className="min-h-screen">
      <Header online={online} onRefresh={refetch} loading={loading} />

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-7">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <div className="rounded-2xl border border-theme bg-surface/50 p-5 sm:p-6">
            <p className="text-xs font-medium text-lotus-600 dark:text-lotus-400 mb-1">
              {heroBadge}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">
              {heroTitle}
            </h1>
            <p className="text-base text-muted leading-relaxed mb-4 max-w-xl">
              {heroSubtitle}
            </p>

            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none ${lang === 'ar' ? 'right-3.5' : 'left-3.5'}`} />
              <input
                type="text"
                placeholder={uiText('searchPlaceholder', lang)}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full py-3.5 rounded-xl input-theme placeholder-muted text-base focus:outline-none focus:ring-2 focus:ring-lotus-500/35 transition-all ${lang === 'ar' ? 'pr-11 pl-3' : 'pl-11 pr-3'}`}
              />
            </div>

            {error === 'offline' && (
              <p className="mt-2.5 text-sm text-amber-600 dark:text-amber-400">
                {uiText('offlineCache', lang)}
              </p>
            )}

            {data?.general && (
              <QuickReferencePanel
                cardChecklist={data.general.cardChecklist}
                electronicCardRules={data.general.electronicCardRules}
                approvalLinks={data.general.approvalLinks}
              />
            )}
          </div>
        </motion.section>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-44 shimmer animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-theme">
              <h2 className="text-base sm:text-lg font-semibold text-primary">
                {uiText('companiesHeading', lang)}
              </h2>
              <span className="text-sm text-muted">
                {uiText('companyCount', lang, { count: String(filtered.length) })}
              </span>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-center text-muted text-base py-10">
                {uiText('noSearchResults', lang)}
              </p>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-5 text-xs text-muted border-t border-theme mt-8">
        <p>
          {lang === 'en' ? branding.titleEn : branding.titleAr} · {lang === 'en' ? (branding.departmentEn || branding.departmentAr) : branding.departmentAr}
        </p>
        <p className="mt-0.5 opacity-75">
          {uiText('lastUpdated', lang)} {data?.meta.lastUpdated || '2026-08'}
        </p>
      </footer>
    </div>
  );
}

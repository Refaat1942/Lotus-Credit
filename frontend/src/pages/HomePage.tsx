import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CreditCard, Link2 } from 'lucide-react';
import Header from '../components/Header';
import CompanyCard from '../components/CompanyCard';
import { useRules } from '../hooks/useRules';
import { useBranding } from '../hooks/useBranding';

export default function HomePage() {
  const { data, loading, online, error, refetch } = useRules();
  const branding = useBranding();
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

  return (
    <div className="min-h-screen">
      <Header online={online} onRefresh={refetch} loading={loading} />

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
        {/* Intro + search — no duplicate logo or giant titles */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-theme bg-surface/50 p-5 sm:p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-lotus-600 dark:text-lotus-400 mb-1">
              {branding.subtitleAr}
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-primary mb-1">
              {branding.heroTitleAr}
            </h1>
            <p className="text-sm text-muted leading-relaxed mb-4 max-w-xl">
              {branding.heroSubtitleAr}
            </p>

            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث عن شركة تأمين، خط ساخن، أو نظام موافقات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-3 pr-10 pl-3 rounded-lg input-theme placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/35 transition-all"
              />
            </div>

            {error === 'offline' && (
              <p className="mt-2.5 text-xs text-amber-600 dark:text-amber-400">
                بيانات محفوظة محلياً — سيتم التحديث عند عودة الاتصال
              </p>
            )}
          </div>
        </motion.section>

        {/* Quick links */}
        {data?.general && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="grid sm:grid-cols-2 gap-3 mb-6"
          >
            <div className="rounded-xl border border-theme bg-surface/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-lotus-500 shrink-0" />
                <h2 className="text-sm font-semibold text-primary">فحص الكارنية</h2>
              </div>
              <ul className="text-xs text-muted space-y-0.5 leading-relaxed">
                {data.general.cardChecklist.slice(0, 5).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
                <li className="text-lotus-600 dark:text-lotus-400">
                  + {data.general.cardChecklist.length - 5} عناصر أخرى
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-theme bg-surface/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-lotus-500 shrink-0" />
                <h2 className="text-sm font-semibold text-primary">روابط الموافقات</h2>
              </div>
              <p className="text-xs text-muted">
                {data.general.approvalLinks.length} رابط وبوابة موافقات مستخرجة من المستند
              </p>
            </div>
          </motion.div>
        )}

        {/* Companies */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-44 shimmer animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme">
              <h2 className="text-sm font-semibold text-primary">شركات التأمين</h2>
              <span className="text-xs text-muted">{filtered.length} شركة</span>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-center text-muted text-sm py-10">لا توجد نتائج للبحث</p>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-5 text-[11px] text-muted border-t border-theme mt-8">
        <p>
          {branding.titleAr} · {branding.departmentAr}
        </p>
        <p className="mt-0.5 opacity-75">آخر تحديث: {data?.meta.lastUpdated || '2026-08'}</p>
      </footer>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, CreditCard, Link2 } from 'lucide-react';
import Header from '../components/Header';
import CompanyCard from '../components/CompanyCard';
import LotusLogo from '../components/LotusLogo';
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 relative"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-6"
          >
            <LotusLogo size="lg" animate />
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-lotus-300 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            {branding.titleEn} · {data?.meta.lastUpdated || '2026-08'}
          </motion.div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">{branding.heroTitleAr}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            {branding.heroSubtitleAr}
          </p>

          {error === 'offline' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-amber-400 text-sm"
            >
              تعمل من البيانات المحفوظة محلياً — سيتم التحديث عند عودة الاتصال
            </motion.p>
          )}
        </motion.section>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative max-w-xl mx-auto mb-10"
        >
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن شركة تأمين، خط ساخن، أو نظام موافقات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-4 pr-12 pl-4 rounded-2xl glass text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-lotus-500/50 transition-all"
          />
        </motion.div>

        {/* Quick links */}
        {data?.general && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-2 gap-4 mb-10"
          >
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-lotus-400" />
                <h3 className="font-bold">فحص الكارنية</h3>
              </div>
              <ul className="text-sm text-slate-300 space-y-1">
                {data.general.cardChecklist.slice(0, 5).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
                <li className="text-lotus-400">+ {data.general.cardChecklist.length - 5} عناصر أخرى</li>
              </ul>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-5 h-5 text-lotus-400" />
                <h3 className="font-bold">روابط الموافقات</h3>
              </div>
              <p className="text-sm text-slate-300">
                {data.general.approvalLinks.length} رابط وبوابة موافقات مستخرجة من المستند
              </p>
            </div>
          </motion.div>
        )}

        {/* Companies grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-48 shimmer animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                شركات التأمين ({filtered.length})
              </h3>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.div
                layout
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filtered.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-12">لا توجد نتائج للبحث</p>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm border-t border-white/5 mt-12">
        <div className="flex justify-center mb-3">
          <LotusLogo size="sm" />
        </div>
        <p>{branding.footerText} · آخر تحديث: {data?.meta.lastUpdated || '2026-08'}</p>
      </footer>
    </div>
  );
}

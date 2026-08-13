import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Phone, ExternalLink, FileText, ClipboardList,
  AlertTriangle, Ban, Copy, Check,
} from 'lucide-react';
import { useState } from 'react';
import Header from '../components/Header';
import LotusLogo from '../components/LotusLogo';
import MediaGallery from '../components/MediaGallery';
import { RuleItem, NotesList, StepWizard } from '../components/RuleDisplay';
import { useRules } from '../hooks/useRules';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, online, refetch, loading } = useRules();
  const [copied, setCopied] = useState<string | null>(null);
  const company = data?.companies.find((c) => c.id === id);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!company && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">الشركة غير موجودة</p>
          <Link to="/" className="text-lotus-400 hover:underline">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const rules = company?.rules;
  const color = company?.color || '#14b8a6';

  const dispensingSteps = [
    { title: 'فحص الكارنية', content: 'التأكد من صلاحية العضوية وبيانات المستفيد' },
    ...(company?.forms?.map((f) => ({ title: 'طريقة الصرف', content: f })) || []),
    { title: 'الموافقة', content: `عبر ${company?.approvalSystem || 'النظام المعتمد'}` },
    { title: 'الصرف', content: 'مطابقة الكميات والتحمل مع الموافقة' },
  ];

  return (
    <div className="min-h-screen">
      <Header online={online} onRefresh={refetch} loading={loading} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-lotus-400 mb-6 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للشركات
        </Link>

        {company && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 mb-8 relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2"
                style={{ backgroundColor: color }}
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <LotusLogo size="sm" className="opacity-90" />
                  <div className="flex-1 min-w-[200px]">
                    <h1 className="text-3xl font-bold text-white mb-1">{company.nameAr}</h1>
                    <p className="text-slate-400">{company.nameEn}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {company.hotline && (
                      <motion.a
                        whileHover={{ scale: 1.05 }}
                        href={`tel:${company.hotline}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      >
                        <Phone className="w-4 h-4" />
                        {company.hotline}
                      </motion.a>
                    )}
                  </div>
                </div>

                {company.approvalPortal && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    href={company.approvalPortal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500/20 text-lotus-300 border border-lotus-500/30 mb-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح بوابة الموافقات ({company.approvalSystem})
                  </motion.a>
                )}

                {company.contacts && (
                  <div className="flex flex-wrap gap-2">
                    {company.contacts.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => copyText(c.value, `contact-${i}`)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {copied === `contact-${i}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                        <span className="text-slate-400">{c.type}:</span>
                        <span className="text-white">{c.value}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {company.media && company.media.length > 0 && (
              <MediaGallery
                media={company.media}
                companyName={company.nameAr}
                accentColor={color}
              />
            )}

            {/* Dispensing wizard */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 mb-6"
            >
              <h2 className="flex items-center gap-2 text-xl font-bold mb-6">
                <ClipboardList className="w-6 h-6 text-lotus-400" />
                خطوات الصرف
              </h2>
              <StepWizard steps={dispensingSteps} />
            </motion.section>

            {/* Forms */}
            {company.forms && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6 mb-6"
              >
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                  <FileText className="w-6 h-6 text-lotus-400" />
                  طرق الصرف المقبولة
                </h2>
                <div className="grid gap-2">
                  {company.forms.map((form, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                    >
                      <span className="w-8 h-8 rounded-lg bg-lotus-500/20 flex items-center justify-center text-lotus-300 font-bold text-sm">
                        {i + 1}
                      </span>
                      <span className="text-slate-200">{form}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Rules grid */}
            {rules && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-6 mb-6"
              >
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  شروط الصرف
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RuleItem label="صلاحية الروشتة" value={rules.prescriptionValidity} />
                  <RuleItem label="أقصى مدة صرف" value={rules.maxDispensePeriod} />
                  <RuleItem label="صلاحية الموافقة" value={rules.approvalValidity} />
                  <RuleItem label="الحد الأقصى المالي" value={rules.financialLimit} />
                  <RuleItem label="نسبة التحمل" value={rules.copay} />
                  <RuleItem label="موافقة مسبقة" value={rules.priorApprovalRequired} />
                  <RuleItem label="روشتة خارجية" value={rules.externalRxAllowed} />
                  <RuleItem label="سياسة البدائل" value={rules.alternativesPolicy} />
                  <RuleItem label="صورة الكارنية" value={rules.cardRequired} type="boolean" />
                  <RuleItem label="توقيع العميل" value={rules.signatureRequired} type="boolean" />
                  <RuleItem label="ختم الطبيب/المستشفى" value={rules.stampRequired} type="boolean" />
                  <RuleItem label="التشخيص" value={rules.diagnosisRequired} type="boolean" />
                  {rules.diagnosisHelp && (
                    <RuleItem label="مساعدة التشخيص" value={rules.diagnosisHelp} />
                  )}
                </div>
              </motion.section>
            )}

            {rules?.importantNotes && (
              <div className="mb-6">
                <NotesList title="ملاحظات هامة" items={rules.importantNotes} variant="warning" />
              </div>
            )}

            {rules?.prohibitions && (
              <div className="mb-6">
                <NotesList title="محظورات الصرف" items={rules.prohibitions} variant="danger" />
              </div>
            )}

            {company.cardInstructions && (
              <NotesList
                title="تعليمات الكارنية الإلكترونية"
                items={company.cardInstructions}
                variant="info"
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

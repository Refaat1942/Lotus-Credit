import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, ListChecks, FileImage, AlertTriangle, Link2,
  Phone, ExternalLink, ChevronLeft, ChevronRight, Check, ZoomIn, X,
} from 'lucide-react';
import type { Company, CompanyMedia } from '../types';
import CompanyLogo from './CompanyLogo';
import CompanyLinks from './CompanyLinks';
import { RuleItem, NotesList } from './RuleDisplay';
import { galleryMedia } from '../utils/mediaFilters';

type Phase = 'start' | 'steps' | 'forms' | 'rules' | 'links';

interface DispensingGuideProps {
  company: Company;
}

const PHASES: { id: Phase; label: string; icon: typeof PlayCircle }[] = [
  { id: 'start', label: 'البداية', icon: PlayCircle },
  { id: 'steps', label: 'خطوات الصرف', icon: ListChecks },
  { id: 'forms', label: 'النماذج والمستند', icon: FileImage },
  { id: 'rules', label: 'الشروط', icon: AlertTriangle },
  { id: 'links', label: 'الروابط', icon: Link2 },
];

function normalizeAr(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function formKeywords(form: string): string[] {
  const n = normalizeAr(form);
  const keys = [n];
  if (n.includes('أزرق') || n.includes('ازرق')) keys.push('أزرق', 'ازرق', 'blue');
  if (n.includes('أصفر') || n.includes('اصفر')) keys.push('أصفر', 'اصفر', 'yellow');
  if (n.includes('كربون')) keys.push('كربون', 'carbon');
  if (n.includes('روشت')) keys.push('روشت');
  if (n.includes('e-form') || n.includes('eform')) keys.push('form', 'e-form');
  if (n.includes('موافق')) keys.push('موافق');
  if (n.includes('كارن')) keys.push('كارن', 'card');
  return keys;
}

function scoreMediaForForm(form: string, item: CompanyMedia): number {
  const title = normalizeAr(item.title);
  let score = 0;
  for (const kw of formKeywords(form)) {
    if (title.includes(normalizeAr(kw))) score += 3;
  }
  if (item.type === 'card') score += 2;
  if (item.type === 'photo' && title.includes('نموذج')) score += 1;
  return score;
}

function pickMediaForForm(form: string, media: CompanyMedia[]): CompanyMedia | null {
  const ranked = media
    .map((m) => ({ m, score: scoreMediaForForm(form, m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.m ?? null;
}

export default function DispensingGuide({ company }: DispensingGuideProps) {
  const color = company.color || '#14b8a6';
  const rules = company.rules;
  const media = useMemo(() => galleryMedia(company.media || []), [company.media]);
  const cardDocs = useMemo(() => media.filter((m) => m.type === 'card'), [media]);

  const [phase, setPhase] = useState<Phase>('start');
  const [stepDone, setStepDone] = useState<Record<number, boolean>>({});
  const [selectedForm, setSelectedForm] = useState(0);
  const [lightbox, setLightbox] = useState<CompanyMedia | null>(null);

  const forms = company.forms || [];
  const activeForm = forms[selectedForm];
  const activeDoc = activeForm ? pickMediaForForm(activeForm, media) : cardDocs[0] ?? null;

  const dispensingSteps = [
    { title: 'فحص الكارنية', detail: 'تأكد من صلاحية العضوية وبيانات المستفيد والتاريخ', tip: company.cardInstructions?.[0] },
    ...(forms.map((f) => ({
      title: 'طريقة الصرف',
      detail: f,
      tip: undefined as string | undefined,
      formName: f,
    })) || []),
    { title: 'الموافقة', detail: `عبر ${company.approvalSystem || 'النظام المعتمد'}`, tip: company.approvalPortal ? 'افتح بوابة الموافقات من تبويب البداية' : undefined },
    { title: 'تنفيذ الصرف', detail: 'طابق الكميات والتحمل مع الموافقة قبل إغلاق الفاتورة', tip: rules?.alternativesPolicy },
  ];

  const completedSteps = Object.values(stepDone).filter(Boolean).length;

  const goToFormDoc = (formName: string) => {
    const idx = forms.findIndex((f) => f === formName);
    if (idx >= 0) setSelectedForm(idx);
    setPhase('forms');
  };

  return (
    <div className="space-y-4">
      {/* Phase navigation — sticky on mobile */}
      <div className="sticky top-[52px] z-40 -mx-1 px-1 py-2 bg-[var(--color-bg-start)]/90 backdrop-blur-md border-b border-theme mb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {PHASES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPhase(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                phase === id
                  ? 'bg-lotus-500/25 text-lotus-600 dark:text-lotus-300 border border-lotus-500/40'
                  : 'bg-surface/60 text-muted border border-transparent hover:bg-surface'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        {phase === 'steps' && (
          <p className="text-xs text-muted mt-2">
            {completedSteps} / {dispensingSteps.length} خطوات مكتملة
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'start' && (
          <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <CompanyLogo company={company} size="lg" />
              <div className="flex-1 min-w-[180px]">
                <h1 className="text-xl sm:text-2xl font-bold text-primary">{company.nameAr}</h1>
                <p className="text-muted text-sm">{company.nameEn}</p>
              </div>
            </div>
            <p className="text-base text-muted mb-5 leading-relaxed">
              اتبع التبويبات بالترتيب: خطوات الصرف ← النماذج (المستند الأزرق/الأصفر) ← الشروط ← الروابط
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {company.hotline && (
                <a
                  href={`tel:${company.hotline}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-sm font-medium"
                >
                  <Phone className="w-4 h-4" />
                  {company.hotline}
                </a>
              )}
              {company.approvalPortal && (
                <a
                  href={company.approvalPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lotus-500/15 text-lotus-700 dark:text-lotus-300 border border-lotus-500/30 text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  بوابة {company.approvalSystem || 'الموافقات'}
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPhase('steps')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-600 text-white font-bold text-base"
            >
              ابدأ خطوات الصرف ←
            </button>
          </motion.div>
        )}

        {phase === 'steps' && (
          <motion.div key="steps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-lotus-500" />
              خطوات الصرف — علّم كل خطوة بعد تنفيذها
            </h2>
            <div className="space-y-3">
              {dispensingSteps.map((step, i) => {
                const done = stepDone[i];
                const hasForm = 'formName' in step && step.formName;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 transition-colors ${
                      done ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-theme bg-surface/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setStepDone((s) => ({ ...s, [i]: !s[i] }))}
                        className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                          done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-lotus-500/50 text-lotus-600 dark:text-lotus-400'
                        }`}
                      >
                        {done ? <Check className="w-5 h-5" /> : i + 1}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary">{step.title}</p>
                        <p className="text-sm text-muted mt-1 leading-relaxed">{step.detail}</p>
                        {step.tip && <p className="text-xs text-lotus-600 dark:text-lotus-400 mt-2">💡 {step.tip}</p>}
                        {hasForm && (
                          <button
                            type="button"
                            onClick={() => goToFormDoc(step.formName!)}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-lotus-600 dark:text-lotus-400 hover:underline"
                          >
                            <FileImage className="w-4 h-4" />
                            عرض النموذج في المستند
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setPhase('forms')} className="flex-1 py-3 rounded-xl bg-lotus-500 text-white font-medium">
                التالي: النماذج والمستند
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'forms' && (
          <motion.div key="forms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass-card p-5">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <FileImage className="w-5 h-5 text-lotus-500" />
                اختر طريقة الصرف — يظهر النموذج من المستند
              </h2>
              {forms.length === 0 ? (
                <p className="text-muted text-sm">لا توجد طرق صرف مسجلة لهذه الشركة.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {forms.map((form, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedForm(i)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        selectedForm === i
                          ? 'bg-lotus-500/20 border-lotus-500/50 text-primary'
                          : 'bg-surface/50 border-theme text-muted hover:bg-surface'
                      }`}
                    >
                      {i + 1}. {form}
                    </button>
                  ))}
                </div>
              )}

              {activeForm && (
                <p className="text-sm text-muted mb-3">
                  الطريقة المختارة: <span className="font-semibold text-primary">{activeForm}</span>
                </p>
              )}

              {activeDoc ? (
                <div className="rounded-xl border border-theme overflow-hidden bg-black/20">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-theme bg-surface/50">
                    <p className="text-sm font-medium text-primary truncate">{activeDoc.title}</p>
                    <button
                      type="button"
                      onClick={() => setLightbox(activeDoc)}
                      className="p-1.5 rounded-lg hover:bg-surface text-muted"
                      title="تكبير"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setLightbox(activeDoc)} className="block w-full">
                    <img
                      src={activeDoc.url}
                      alt={activeDoc.title}
                      className="w-full max-h-[min(70vh,520px)] object-contain bg-white/5"
                    />
                  </button>
                  <p className="text-xs text-muted px-3 py-2">صفحة {activeDoc.page} · اضغط على الصورة للتكبير</p>
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400 p-4 rounded-xl bg-amber-500/10">
                  لم يُعثر على صورة مطابقة — اختر صفحة من المعرض أدناه.
                </p>
              )}
            </div>

            {cardDocs.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-primary mb-3">كل صفحات المستند ({cardDocs.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cardDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setLightbox(doc)}
                      className="rounded-lg border border-theme overflow-hidden text-right hover:border-lotus-500/40 transition-colors"
                    >
                      <img src={doc.url} alt={doc.title} className="w-full aspect-[4/3] object-cover object-top bg-white/5" loading="lazy" />
                      <p className="text-[11px] text-muted p-1.5 line-clamp-2">{doc.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {media.filter((m) => m.type === 'photo').length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-primary mb-3">صور إضافية (كارنية، موافقات)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {media.filter((m) => m.type === 'photo').slice(0, 12).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setLightbox(doc)}
                      className="rounded-lg border border-theme overflow-hidden hover:border-lotus-500/40"
                    >
                      <img src={doc.url} alt={doc.title} className="w-full aspect-square object-contain bg-black/20" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'rules' && (
          <motion.div key="rules" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {rules && (
              <div className="glass-card p-5">
                <h2 className="text-lg font-bold text-primary mb-4">شروط الصرف</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RuleItem label="صلاحية الروشتة" value={rules.prescriptionValidity} />
                  <RuleItem label="أقصى مدة صرف" value={rules.maxDispensePeriod} />
                  <RuleItem label="صلاحية الموافقة" value={rules.approvalValidity} />
                  <RuleItem label="الحد المالي" value={rules.financialLimit} />
                  <RuleItem label="نسبة التحمل" value={rules.copay} />
                  <RuleItem label="موافقة مسبقة" value={rules.priorApprovalRequired} />
                  <RuleItem label="روشتة خارجية" value={rules.externalRxAllowed} />
                  <RuleItem label="سياسة البدائل" value={rules.alternativesPolicy} />
                  <RuleItem label="صورة الكارنية" value={rules.cardRequired} type="boolean" />
                  <RuleItem label="توقيع العميل" value={rules.signatureRequired} type="boolean" />
                  <RuleItem label="ختم الطبيب" value={rules.stampRequired} type="boolean" />
                  <RuleItem label="التشخيص" value={rules.diagnosisRequired} type="boolean" />
                </div>
              </div>
            )}
            {rules?.importantNotes && <NotesList title="ملاحظات هامة" items={rules.importantNotes} variant="warning" />}
            {rules?.prohibitions && <NotesList title="محظورات الصرف" items={rules.prohibitions} variant="danger" />}
            {company.cardInstructions && (
              <NotesList title="تعليمات الكارنية" items={company.cardInstructions} variant="info" />
            )}
          </motion.div>
        )}

        {phase === 'links' && company.links && company.links.length > 0 && (
          <motion.div key="links" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CompanyLinks links={company.links} accentColor={color} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
            onClick={() => setLightbox(null)}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
              <p className="text-white font-medium truncate">{lightbox.title}</p>
              <button type="button" onClick={() => setLightbox(null)} className="p-2 rounded-lg bg-white/10">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 min-h-0" onClick={(e) => e.stopPropagation()}>
              <img src={lightbox.url} alt={lightbox.title} className="max-w-full max-h-[85vh] object-contain" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

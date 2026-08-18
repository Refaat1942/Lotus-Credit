import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, ListChecks, FileImage, AlertTriangle, Link2,
  Phone, ExternalLink, Check, ZoomIn, X, Sparkles,
} from 'lucide-react';
import type { AppCopyBundle, CoachCopyBundle, Company, CompanyMedia, GuideCopyBundle } from '../types';
import CompanyLogo from './CompanyLogo';
import CompanyLinks from './CompanyLinks';
import MediaLinks from './MediaLinks';
import DispensingCoach from './DispensingCoach';
import { RuleItem, NotesList } from './RuleDisplay';
import { galleryMedia } from '../utils/mediaFilters';
import { resolveFormDoc } from '../utils/coachSteps';
import { useAppCopy } from '../hooks/useAppCopy';

type Phase = 'start' | 'steps' | 'forms' | 'rules' | 'links';

interface DispensingGuideProps {
  company: Company;
  globalCoach?: CoachCopyBundle;
  ui?: AppCopyBundle;
  guide?: GuideCopyBundle;
}

const PHASE_ICONS = {
  start: PlayCircle,
  steps: ListChecks,
  forms: FileImage,
  rules: AlertTriangle,
  links: Link2,
} as const;

export default function DispensingGuide({ company, globalCoach, ui, guide }: DispensingGuideProps) {
  const { u, g } = useAppCopy(ui, guide);
  const color = company.color || '#14b8a6';
  const rules = company.rules;
  const media = useMemo(() => galleryMedia(company.media || []), [company.media]);
  const cardDocs = useMemo(() => media.filter((m) => m.type === 'card'), [media]);

  const [coachActive, setCoachActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('start');
  const [stepDone, setStepDone] = useState<Record<number, boolean>>({});
  const [selectedForm, setSelectedForm] = useState(0);
  const [lightbox, setLightbox] = useState<CompanyMedia | null>(null);

  const forms = company.forms || [];
  const activeForm = forms[selectedForm];
  const activeDoc = activeForm
    ? resolveFormDoc(activeForm, media, company, selectedForm)
    : cardDocs[0] ?? null;

  const phases: Phase[] = ['start', 'steps', 'forms', 'rules', 'links'];

  const dispensingSteps = [
    { title: g('steps', 'stepCardTitle'), detail: g('steps', 'stepCardDetail'), tip: company.cardInstructions?.[0] },
    ...(forms.map((f) => ({
      title: g('steps', 'stepFormTitle'),
      detail: f,
      tip: undefined as string | undefined,
      formName: f,
    })) || []),
    {
      title: g('steps', 'stepApprovalTitle'),
      detail: g('steps', 'stepApprovalDetail', { system: company.approvalSystem || g('steps', 'defaultSystem') }),
      tip: company.approvalPortal ? g('steps', 'stepApprovalTip') : undefined,
    },
    { title: g('steps', 'stepDispenseTitle'), detail: g('steps', 'stepDispenseDetail'), tip: rules?.alternativesPolicy },
  ];

  const completedSteps = Object.values(stepDone).filter(Boolean).length;

  const goToFormDoc = (formName: string) => {
    const idx = forms.findIndex((f) => f === formName);
    if (idx >= 0) setSelectedForm(idx);
    setPhase('forms');
    setCoachActive(false);
  };

  if (coachActive) {
    return (
      <DispensingCoach
        company={company}
        globalCoach={globalCoach}
        onExit={() => setCoachActive(false)}
        onOpenReference={() => {
          setCoachActive(false);
          setPhase('forms');
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[52px] z-40 -mx-1 px-1 py-2 bg-[var(--color-bg-start)]/90 backdrop-blur-md border-b border-theme mb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {phases.map((id) => {
            const Icon = PHASE_ICONS[id];
            return (
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
              {g('phases', id)}
            </button>
            );
          })}
        </div>
        {phase === 'steps' && (
          <p className="text-xs text-muted mt-2">
            {g('steps', 'progress', { done: completedSteps, total: dispensingSteps.length })}
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

            <div className="rounded-xl border border-lotus-500/30 bg-lotus-500/10 p-4 mb-5">
              <p className="text-primary font-semibold flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-lotus-500" />
                {g('start', 'coachTitle')}
              </p>
              <p className="text-sm text-muted leading-relaxed">
                {g('start', 'coachDesc')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
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
                  {g('start', 'portalPrefix')} {company.approvalSystem || g('start', 'defaultPortal')}
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCoachActive(true)}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-600 text-white font-bold text-base shadow-lg shadow-lotus-500/25 mb-3"
            >
              {g('start', 'startCoachBtn')}
            </button>
            <button
              type="button"
              onClick={() => setPhase('steps')}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-muted hover:text-primary border border-theme hover:bg-surface/50 transition-colors"
            >
              {g('start', 'manualBrowseBtn')}
            </button>
          </motion.div>
        )}

        {phase === 'steps' && (
          <motion.div key="steps" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-lotus-500" />
                {g('steps', 'heading')}
              </h2>
              <button
                type="button"
                onClick={() => setCoachActive(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-lotus-500/15 text-lotus-600 dark:text-lotus-400 border border-lotus-500/30 whitespace-nowrap"
              >
                {g('common', 'interactiveBadge')}
              </button>
            </div>
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
                            {g('steps', 'viewFormBtn')}
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
                {g('steps', 'nextFormsBtn')}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'forms' && (
          <motion.div key="forms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-lotus-500" />
                  {g('forms', 'heading')}
                </h2>
                <button
                  type="button"
                  onClick={() => setCoachActive(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-lotus-500/15 text-lotus-600 dark:text-lotus-400 border border-lotus-500/30"
                >
                  {g('common', 'interactiveBadge')}
                </button>
              </div>
              {forms.length === 0 ? (
                <p className="text-muted text-sm">{g('forms', 'noForms')}</p>
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
                  {g('forms', 'selectedLabel')} <span className="font-semibold text-primary">{activeForm}</span>
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
                      title={g('forms', 'zoomTitle')}
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
                  <p className="text-xs text-muted px-3 py-2">{g('forms', 'pageHint', { page: activeDoc.page })}</p>
                  {activeDoc.links && activeDoc.links.length > 0 && (
                    <MediaLinks links={activeDoc.links} accentColor={color} />
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400 p-4 rounded-xl bg-amber-500/10">
                  {g('forms', 'noImageWarning')}
                </p>
              )}
            </div>

            {cardDocs.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-primary mb-3">{g('forms', 'galleryCards', { count: cardDocs.length })}</h3>
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
                <h3 className="text-sm font-semibold text-primary mb-3">{g('forms', 'galleryPhotos')}</h3>
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
                <h2 className="text-lg font-bold text-primary mb-4">{g('rules', 'heading')}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RuleItem label={u('ruleLabels', 'prescriptionValidity')} value={rules.prescriptionValidity} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'maxDispensePeriod')} value={rules.maxDispensePeriod} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'approvalValidity')} value={rules.approvalValidity} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'financialLimit')} value={rules.financialLimit} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'copay')} value={rules.copay} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'priorApprovalRequired')} value={rules.priorApprovalRequired} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'externalRxAllowed')} value={rules.externalRxAllowed} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'alternativesPolicy')} value={rules.alternativesPolicy} booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'cardRequired')} value={rules.cardRequired} type="boolean" booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'signatureRequired')} value={rules.signatureRequired} type="boolean" booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'stampRequired')} value={rules.stampRequired} type="boolean" booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                  <RuleItem label={u('ruleLabels', 'diagnosisRequired')} value={rules.diagnosisRequired} type="boolean" booleanYes={u('ruleLabels', 'booleanYes')} booleanNo={u('ruleLabels', 'booleanNo')} />
                </div>
              </div>
            )}
            {rules?.importantNotes && <NotesList title={u('ruleLabels', 'importantNotes')} items={rules.importantNotes} variant="warning" />}
            {rules?.prohibitions && <NotesList title={u('ruleLabels', 'prohibitions')} items={rules.prohibitions} variant="danger" />}
            {company.cardInstructions && (
              <NotesList title={u('ruleLabels', 'cardInstructions')} items={company.cardInstructions} variant="info" />
            )}
          </motion.div>
        )}

        {phase === 'links' && company.links && company.links.length > 0 && (
          <motion.div key="links" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CompanyLinks links={company.links} accentColor={color} linksTitle={u('ruleLabels', 'importantLinks')} copyLabel={u('ruleLabels', 'copyLink')} />
          </motion.div>
        )}
      </AnimatePresence>

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

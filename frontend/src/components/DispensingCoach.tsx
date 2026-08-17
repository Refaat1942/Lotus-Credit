import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, User, Phone, ExternalLink, ZoomIn, X, RotateCcw, BookOpen,
  Check, ChevronLeft, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CoachCopyBundle, Company, CompanyMedia } from '../types';
import CompanyLogo from './CompanyLogo';
import MediaLinks from './MediaLinks';
import { galleryMedia } from '../utils/mediaFilters';
import { resolveFormDoc, resolveStepMedia, resolveAnswerMedia } from '../utils/coachSteps';
import {
  buildFinalChecklistKeys,
  formHintKey,
  useCoachCopy,
  type ChecklistKey,
} from '../hooks/useCoachCopy';
import { useLanguage } from '../context/LanguageContext';

type Phase =
  | 'welcome'
  | 'card_check'
  | 'card_help'
  | 'form_pick'
  | 'form_doc'
  | 'approval_check'
  | 'approval_portal'
  | 'rules_tip'
  | 'final_checks'
  | 'done';

interface ChatLine {
  id: string;
  from: 'coach' | 'user';
  text: string;
  doc?: CompanyMedia;
  docs?: CompanyMedia[];
  bullets?: string[];
}

interface ActionBtn {
  id: string;
  label: string;
  primary?: boolean;
  href?: string;
  external?: boolean;
}

interface DispensingCoachProps {
  company: Company;
  globalCoach?: CoachCopyBundle;
  onExit: () => void;
  onOpenReference?: () => void;
}

let lineId = 0;
function nextId() {
  lineId += 1;
  return `line-${lineId}`;
}

export default function DispensingCoach({
  company,
  globalCoach,
  onExit,
  onOpenReference,
}: DispensingCoachProps) {
  const rules = company.rules;
  const media = useMemo(() => galleryMedia(company.media || []), [company.media]);
  const forms = company.forms || [];
  const color = company.color || '#14b8a6';
  const { lang } = useLanguage();
  const { msg, btn, checklist, ui, formLabel, formLabelByName } = useCoachCopy(
    company,
    globalCoach,
  );

  const [phase, setPhase] = useState<Phase>('welcome');
  const [history, setHistory] = useState<ChatLine[]>([]);
  const [actions, setActions] = useState<ActionBtn[]>([]);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<CompanyMedia | null>(null);
  const [finalChecks, setFinalChecks] = useState<Record<string, boolean>>({});
  const [typing, setTyping] = useState(false);
  const [lightbox, setLightbox] = useState<CompanyMedia | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bootRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, typing, actions]);

  const pushCoach = useCallback((text: string, extra?: Partial<ChatLine>) => {
    setHistory((h) => [...h, { id: nextId(), from: 'coach', text, ...extra }]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setHistory((h) => [...h, { id: nextId(), from: 'user', text }]);
  }, []);

  const coachSay = useCallback(
    (text: string, extra?: Partial<ChatLine>, delay = 500) => {
      setTyping(true);
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          pushCoach(text, extra);
          setTyping(false);
          resolve();
        }, delay);
      });
    },
    [pushCoach],
  );

  const systemName = company.approvalSystem || (lang === 'en' ? 'the system' : 'النظام');

  const setPhaseActions = useCallback(
    (p: Phase, opts?: { doc?: CompanyMedia | null }) => {
      switch (p) {
        case 'welcome':
          setActions([
            { id: 'start', label: btn('start'), primary: true },
            ...(onOpenReference ? [{ id: 'ref', label: btn('ref') }] : []),
          ]);
          break;
        case 'card_check':
          setActions([
            { id: 'card_ok', label: btn('cardOk'), primary: true },
            { id: 'card_bad', label: btn('cardBad') },
            { id: 'no_card', label: btn('noCard') },
          ]);
          break;
        case 'card_help':
          setActions([
            { id: 'card_fixed', label: btn('cardFixed'), primary: true },
            ...(company.hotline
              ? [{
                  id: 'call',
                  label: btn('call', { hotline: company.hotline }),
                  href: `tel:${company.hotline}`,
                }]
              : []),
          ]);
          break;
        case 'form_pick':
          setActions([
            ...forms.map((_, i) => ({ id: `form-${i}`, label: formLabel(i), primary: i === 0 })),
            { id: 'form_unsure', label: btn('formUnsure') },
          ]);
          break;
        case 'form_doc':
          setActions([
            { id: 'doc_ok', label: btn('docOk'), primary: true },
            ...(opts?.doc ? [{ id: 'doc_zoom', label: btn('docZoom') }] : []),
            { id: 'form_again', label: btn('formAgain') },
          ]);
          break;
        case 'approval_check':
          setActions([
            { id: 'need_approval', label: btn('needApproval'), primary: true },
            { id: 'no_approval', label: btn('noApproval') },
          ]);
          break;
        case 'approval_portal':
          setActions([
            { id: 'got_approval', label: btn('gotApproval'), primary: true },
            ...(company.approvalPortal
              ? [{
                  id: 'open_portal',
                  label: btn('openPortal', { system: systemName }),
                  href: company.approvalPortal,
                  external: true,
                  primary: true,
                }]
              : []),
            { id: 'approval_help', label: btn('approvalHelp') },
          ]);
          break;
        case 'rules_tip':
          setActions([{ id: 'rules_ok', label: btn('rulesOk'), primary: true }]);
          break;
        case 'final_checks':
          setActions([{ id: 'finish', label: btn('finish'), primary: true }]);
          break;
        case 'done':
          setActions([
            { id: 'restart', label: btn('restart'), primary: true },
            { id: 'home', label: btn('home') },
          ]);
          break;
      }
      setPhase(p);
    },
    [btn, company, forms, formLabel, lang, onOpenReference, systemName],
  );

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    (async () => {
      await coachSay(msg('welcome'));
      setPhaseActions('welcome');
    })();
  }, [coachSay, msg, setPhaseActions]);

  const goToFormPick = async () => {
    await coachSay(msg('formPickIntro'));
    setPhaseActions('form_pick');
  };

  const showFormDoc = async (form: string, formIndex: number) => {
    const doc = resolveFormDoc(form, media, company, formIndex);
    setSelectedForm(form);
    setSelectedDoc(doc);
    const displayForm = formLabelByName(form);
    let text = `**${displayForm}**\n\n${doc ? msg('formDocHasImage') : msg('formDocNoImage')}`;
    if (rules?.prescriptionValidity) {
      text += `\n\n${msg('formDocValidity', { validity: rules.prescriptionValidity })}`;
    }
    await coachSay(text, doc ? { doc } : undefined);
    setPhaseActions('form_doc', { doc });
  };

  const showRulesTip = async (form: string | null) => {
    const bullets: string[] = [];
    if (rules?.copay) bullets.push(msg('rulesCopay', { copay: rules.copay }));
    if (rules?.signatureRequired) bullets.push(msg('rulesSignature'));
    if (rules?.stampRequired) bullets.push(msg('rulesStamp'));
    if (rules?.diagnosisRequired) bullets.push(msg('rulesDiagnosis'));
    if (rules?.alternativesPolicy) bullets.push(msg('rulesAlternatives', { policy: rules.alternativesPolicy }));
    if (form) {
      const hintKey = formHintKey(form);
      if (hintKey) bullets.push(msg(hintKey));
    }
    if (rules?.importantNotes?.length) {
      bullets.push(...rules.importantNotes.slice(0, 2));
    }
    const tipDocs = resolveStepMedia('rules_tip', media, company.stepMediaMap);
    await coachSay(
      bullets.length ? msg('rulesTipTitle') : msg('rulesTipEmpty'),
      {
        bullets,
        ...(tipDocs[0] ? { doc: tipDocs[0] } : {}),
      },
    );
    setPhaseActions('rules_tip');
  };

  const showFinalChecks = async () => {
    const keys = buildFinalChecklistKeys(company);
    setFinalChecks(Object.fromEntries(keys.map((k) => [k, false])));
    await coachSay(msg('finalChecksTitle'));
    setPhaseActions('final_checks');
  };

  const handleAction = async (action: ActionBtn) => {
    if (action.href) return;
    pushUser(action.label);

    switch (action.id) {
      case 'start': {
        const cardIntro = resolveStepMedia('card_check', media, company.stepMediaMap)[0];
        await coachSay(msg('cardCheckIntro'), cardIntro ? { doc: cardIntro } : undefined);
        setPhaseActions('card_check');
        break;
      }

      case 'ref':
        onOpenReference?.();
        break;

      case 'card_ok':
        await goToFormPick();
        break;

      case 'card_bad':
      case 'no_card': {
        const tips = company.cardInstructions?.length
          ? company.cardInstructions
          : rules?.cardRequired
            ? [msg('cardHelpDefault1'), msg('cardHelpDefault2')]
            : [msg('cardHelpDefaultNoCard')];
        const intro =
          action.id === 'no_card' && rules?.cardRequired
            ? msg('cardHelpNoCard')
            : msg('cardHelpProblem');
        const helpDocs = [
          ...resolveAnswerMedia(action.id, media, company.coachAnswerMedia),
          ...resolveStepMedia('card_help', media, company.stepMediaMap),
        ].filter((doc, i, arr) => arr.findIndex((d) => d.id === doc.id) === i);
        await coachSay(intro, {
          bullets: tips,
          ...(helpDocs[0] ? { doc: helpDocs[0] } : {}),
          ...(helpDocs.length > 1 ? { docs: helpDocs.slice(1) } : {}),
        });
        setPhaseActions('card_help');
        break;
      }

      case 'card_fixed':
        await goToFormPick();
        break;

      case 'form_unsure':
        await coachSay(
          forms.length
            ? msg('formUnsureList', {
                formsList: forms.map((f, i) => `${i + 1}. ${formLabel(i)}`).join('\n'),
              })
            : msg('formUnsureEmpty'),
        );
        setPhaseActions('form_pick');
        break;

      default:
        if (action.id.startsWith('form-')) {
          const idx = Number(action.id.replace('form-', ''));
          await showFormDoc(forms[idx], idx);
        } else if (action.id === 'doc_ok') {
          if (company.approvalPortal || rules?.priorApprovalRequired) {
            await coachSay(msg('approvalCheckIntro', { system: systemName }));
            setPhaseActions('approval_check');
          } else {
            await showRulesTip(selectedForm);
          }
        } else if (action.id === 'doc_zoom' && selectedDoc) {
          setLightbox(selectedDoc);
        } else if (action.id === 'form_again') {
          setSelectedForm(null);
          setSelectedDoc(null);
          await coachSay(msg('formAgain'));
          setPhaseActions('form_pick');
        } else if (action.id === 'need_approval') {
          await showApprovalStep();
        } else if (action.id === 'no_approval') {
          if (rules?.priorApprovalRequired) {
            await coachSay(msg('approvalNoWarning', {
              note: rules.priorApprovalRequired,
            }));
          }
          await showRulesTip(selectedForm);
        } else if (action.id === 'got_approval') {
          await showRulesTip(selectedForm);
        } else if (action.id === 'approval_help') {
          await showApprovalHelp();
        } else if (action.id === 'rules_ok') {
          await showFinalChecks();
        } else if (action.id === 'finish') {
          const keys = buildFinalChecklistKeys(company);
          const allDone = keys.every((k) => finalChecks[k]);
          if (!allDone && keys.length > 0) {
            await coachSay(msg('finishIncomplete'));
            setPhaseActions('final_checks');
            return;
          }
          await coachSay(msg('finishSuccess'));
          setPhaseActions('done');
        } else if (action.id === 'restart') {
          setHistory([]);
          setSelectedForm(null);
          setSelectedDoc(null);
          setFinalChecks({});
          bootRef.current = false;
          await coachSay(msg('welcomeRestart'));
          setPhaseActions('welcome');
          bootRef.current = true;
        } else if (action.id === 'home') {
          break;
        }
        break;
    }
  };

  const showApprovalStep = async () => {
    const answerPhotos = resolveAnswerMedia('need_approval', media, company.coachAnswerMedia);
    const approvalPhotos = [
      ...answerPhotos,
      ...resolveStepMedia('approval_portal', media, company.stepMediaMap),
    ].filter((doc, i, arr) => arr.findIndex((d) => d.id === doc.id) === i);
    let text = msg('approvalStep', { system: systemName });
    if (rules?.approvalValidity) {
      text += `\n\n${msg('approvalStepValidity', { validity: rules.approvalValidity })}`;
    }
    if (rules?.importantNotes?.some((n) => n.includes('Yodawy') || n.includes('موافقة'))) {
      const note = rules.importantNotes.find((n) => n.includes('تاريخ') || n.includes('Yodawy'));
      if (note) text += `\n\n💡 ${note}`;
    }
    text += `\n\n${msg('approvalStepFooter')}`;
    await coachSay(text, {
      ...(approvalPhotos[0] ? { doc: approvalPhotos[0] } : {}),
      ...(approvalPhotos.length > 1 ? { docs: approvalPhotos.slice(1) } : {}),
    });
    setPhaseActions('approval_portal');
  };

  const showApprovalHelp = async () => {
    const photos = [
      ...resolveAnswerMedia('approval_help', media, company.coachAnswerMedia),
      ...resolveStepMedia('approval_portal', media, company.stepMediaMap),
    ].filter((doc, i, arr) => arr.findIndex((d) => d.id === doc.id) === i);
    const bullets = [
      company.approvalPortal ? msg('approvalHelpPortal', { system: systemName }) : '',
      msg('approvalHelpEnterMeds'),
      rules?.approvalValidity ? msg('approvalHelpValidity', { validity: rules.approvalValidity }) : '',
    ].filter(Boolean);
    await coachSay(msg('approvalHelpTitle'), {
      ...(photos[0] ? { doc: photos[0] } : {}),
      ...(photos.length > 1 ? { docs: photos.slice(1) } : {}),
      bullets,
    });
    setPhaseActions('approval_portal');
  };

  const finalChecklistKeys = buildFinalChecklistKeys(company);
  const allFinalDone = finalChecklistKeys.length > 0 && finalChecklistKeys.every((k) => finalChecks[k]);

  const checklistLabel = (key: ChecklistKey) => {
    if (key === 'formComplete') {
      const label = formLabelByName(selectedForm);
      return label
        ? checklist('formComplete', { form: label })
        : checklist('formCompleteGeneric');
    }
    return checklist(key);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="sticky top-[52px] z-40 -mx-1 px-1 py-2 bg-[var(--color-bg-start)]/95 backdrop-blur-md border-b border-theme">
        <div className="flex items-center gap-3">
          <CompanyLogo company={company} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary text-sm truncate flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-lotus-500 shrink-0" />
              {ui('coachTitle')}
            </p>
            <p className="text-[11px] text-muted">{ui('coachSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary hover:bg-surface border border-theme"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {ui('reference')}
          </button>
        </div>
        <PhaseProgress phase={phase} ui={ui} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {history.map((line) => (
          <ChatBubble key={line.id} line={line} color={color} onZoom={(doc) => setLightbox(doc)} />
        ))}

        {phase === 'final_checks' && finalChecklistKeys.length > 0 && (
          <div className={`${lang === 'ar' ? 'mr-10' : 'ml-10'} space-y-2`}>
            {finalChecklistKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFinalChecks((c) => ({ ...c, [key]: !c[key] }))}
                className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${
                  finalChecks[key]
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-primary'
                    : 'border-theme bg-surface/50 text-muted hover:bg-surface'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  finalChecks[key] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-lotus-500/40'
                }`}>
                  {finalChecks[key] ? <Check className="w-4 h-4" /> : null}
                </span>
                {checklistLabel(key)}
              </button>
            ))}
          </div>
        )}

        {typing && (
          <div className={`flex gap-2 items-center text-muted text-sm ${lang === 'ar' ? 'mr-2' : 'ml-2'}`}>
            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
              <Bot className="w-4 h-4 text-lotus-500" />
            </div>
            <span className="flex gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce [animation-delay:0.15s]">●</span>
              <span className="animate-bounce [animation-delay:0.3s]">●</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-40 -mx-1 px-1 pt-2 pb-4 bg-gradient-to-t from-[var(--color-bg-start)] via-[var(--color-bg-start)] to-transparent">
        <AnimatePresence mode="popLayout">
          {!typing && actions.length > 0 && (
            <motion.div
              key={actions.map((a) => a.id).join(',')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={`flex flex-wrap gap-2 ${lang === 'ar' ? 'justify-end' : 'justify-start'}`}
            >
              {actions.map((action) =>
                action.href ? (
                  <a
                    key={action.id}
                    href={action.href}
                    target={action.external ? '_blank' : undefined}
                    rel={action.external ? 'noopener noreferrer' : undefined}
                    onClick={() => pushUser(action.label)}
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      action.primary
                        ? 'bg-gradient-to-r from-lotus-500 to-lotus-600 text-white shadow-lg shadow-lotus-500/25'
                        : 'bg-surface border border-theme text-primary hover:bg-surface/80'
                    }`}
                  >
                    {action.id === 'call' && <Phone className="w-4 h-4" />}
                    {action.id === 'open_portal' && <ExternalLink className="w-4 h-4" />}
                    {action.label}
                  </a>
                ) : action.id === 'home' ? (
                  <Link
                    key={action.id}
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-surface border border-theme text-primary"
                  >
                    <ChevronLeft className={`w-4 h-4 ${lang === 'en' ? 'rotate-180' : ''}`} />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action)}
                    disabled={action.id === 'finish' && !allFinalDone && finalChecklistKeys.length > 0}
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${
                      action.primary
                        ? 'bg-gradient-to-r from-lotus-500 to-lotus-600 text-white shadow-lg shadow-lotus-500/25'
                        : 'bg-surface border border-theme text-primary hover:bg-surface/80'
                    }`}
                  >
                    {action.id === 'restart' && <RotateCcw className="w-4 h-4" />}
                    {action.label}
                  </button>
                ),
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

function ChatBubble({
  line,
  color,
  onZoom,
}: {
  line: ChatLine;
  color: string;
  onZoom: (doc: CompanyMedia) => void;
}) {
  const { lang } = useLanguage();
  const isCoach = line.from === 'coach';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isCoach ? '' : 'flex-row-reverse'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${
        isCoach ? 'bg-lotus-500/15' : 'bg-lotus-500/25'
      }`}>
        {isCoach ? <Bot className="w-5 h-5 text-lotus-500" /> : <User className="w-5 h-5 text-lotus-600" />}
      </div>
      <div className={`max-w-[min(100%,320px)] sm:max-w-[85%] space-y-2 ${isCoach ? '' : 'items-end flex flex-col'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isCoach
              ? 'bg-surface border border-theme text-primary rounded-tr-sm'
              : 'bg-lotus-500 text-white rounded-tl-sm'
          }`}
          style={isCoach ? {
            [lang === 'ar' ? 'borderRightColor' : 'borderLeftColor']: `${color}40`,
            [lang === 'ar' ? 'borderRightWidth' : 'borderLeftWidth']: 3,
          } : undefined}
        >
          <FormattedText text={line.text} />
          {line.bullets && line.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {line.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-lotus-500 mt-0.5">•</span>
                  <FormattedText text={b} inline />
                </li>
              ))}
            </ul>
          )}
        </div>
        {line.doc && (
          <DocPreview doc={line.doc} color={color} onZoom={onZoom} />
        )}
        {line.docs?.map((doc) => (
          <DocPreview key={doc.id} doc={doc} color={color} onZoom={onZoom} />
        ))}
      </div>
    </motion.div>
  );
}

function DocPreview({
  doc,
  color,
  onZoom,
}: {
  doc: CompanyMedia;
  color: string;
  onZoom: (doc: CompanyMedia) => void;
}) {
  return (
    <div className="rounded-xl border border-theme overflow-hidden bg-black/10 max-w-sm">
      <button type="button" onClick={() => onZoom(doc)} className="block w-full group relative">
        <img
          src={doc.url}
          alt={doc.title}
          className="w-full max-h-48 sm:max-h-64 object-contain bg-white/5"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </span>
      </button>
      <p className="text-[11px] text-muted px-2 py-1.5 truncate">{doc.title}</p>
      {doc.links && doc.links.length > 0 && (
        <MediaLinks links={doc.links} accentColor={color} />
      )}
    </div>
  );
}

function FormattedText({ text, inline }: { text: string; inline?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={inline ? undefined : 'whitespace-pre-wrap'}>
      {parts.map((part, j) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        ),
      )}
    </Tag>
  );
}

function PhaseProgress({
  phase,
  ui,
}: {
  phase: Phase;
  ui: (key: string) => string;
}) {
  const steps: { id: Phase; labelKey: string }[] = [
    { id: 'card_check', labelKey: 'phaseCard' },
    { id: 'form_pick', labelKey: 'phaseForm' },
    { id: 'approval_check', labelKey: 'phaseApproval' },
    { id: 'final_checks', labelKey: 'phaseConfirm' },
    { id: 'done', labelKey: 'phaseDone' },
  ];
  const order: Phase[] = ['welcome', 'card_check', 'card_help', 'form_pick', 'form_doc', 'approval_check', 'approval_portal', 'rules_tip', 'final_checks', 'done'];
  const idx = order.indexOf(phase);

  return (
    <div className="flex gap-1 mt-2">
      {steps.map((s) => {
        const stepIdx = order.indexOf(s.id);
        const active = idx >= stepIdx;
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-0.5">
            <div className={`h-1 w-full rounded-full transition-colors ${active ? 'bg-lotus-500' : 'bg-surface'}`} />
            <span className={`text-[9px] ${active ? 'text-lotus-600 dark:text-lotus-400' : 'text-muted'}`}>
              {ui(s.labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

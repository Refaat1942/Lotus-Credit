import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, User, Phone, ExternalLink, ZoomIn, X, RotateCcw, BookOpen,
  Check, ChevronLeft, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Company, CompanyMedia } from '../types';
import CompanyLogo from './CompanyLogo';
import MediaLinks from './MediaLinks';
import { galleryMedia } from '../utils/mediaFilters';
import { pickApprovalMedia, pickMediaForForm } from '../utils/formMedia';

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
  onExit: () => void;
  onOpenReference?: () => void;
}

let lineId = 0;
function nextId() {
  lineId += 1;
  return `line-${lineId}`;
}

export default function DispensingCoach({ company, onExit, onOpenReference }: DispensingCoachProps) {
  const rules = company.rules;
  const media = useMemo(() => galleryMedia(company.media || []), [company.media]);
  const forms = company.forms || [];
  const color = company.color || '#14b8a6';

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

  const setPhaseActions = useCallback((p: Phase, opts?: { doc?: CompanyMedia | null }) => {
    switch (p) {
      case 'welcome':
        setActions([
          { id: 'start', label: 'نعم، يلا نبدأ ✓', primary: true },
          ...(onOpenReference ? [{ id: 'ref', label: 'عرض المرجع الكامل فقط' }] : []),
        ]);
        break;
      case 'card_check':
        setActions([
          { id: 'card_ok', label: 'نعم، الكارنية تمام ✓', primary: true },
          { id: 'card_bad', label: 'لا، في مشكلة في الكارنية' },
          { id: 'no_card', label: 'مفيش كارنية إلكترونية' },
        ]);
        break;
      case 'card_help':
        setActions([
          { id: 'card_fixed', label: 'تمام، ظبطتها — كمل', primary: true },
          ...(company.hotline
            ? [{ id: 'call', label: `اتصل ${company.hotline}`, href: `tel:${company.hotline}` }]
            : []),
        ]);
        break;
      case 'form_pick':
        setActions([
          ...forms.map((f, i) => ({ id: `form-${i}`, label: f, primary: i === 0 })),
          { id: 'form_unsure', label: 'مش متأكد من النوع' },
        ]);
        break;
      case 'form_doc':
        setActions([
          { id: 'doc_ok', label: 'شفت النموذج — كمل ✓', primary: true },
          ...(opts?.doc ? [{ id: 'doc_zoom', label: 'عرض النموذج أكبر' }] : []),
          { id: 'form_again', label: 'اختر نوع تاني' },
        ]);
        break;
      case 'approval_check':
        setActions([
          { id: 'need_approval', label: 'نعم، محتاج موافقة', primary: true },
          { id: 'no_approval', label: 'لا، صرف مباشر بدون موافقة' },
        ]);
        break;
      case 'approval_portal':
        setActions([
          { id: 'got_approval', label: 'خُدت الموافقة ✓', primary: true },
          ...(company.approvalPortal
            ? [{
                id: 'open_portal',
                label: `افتح ${company.approvalSystem || 'البوابة'}`,
                href: company.approvalPortal,
                external: true,
                primary: true,
              }]
            : []),
          { id: 'approval_help', label: 'محتاج مساعدة في الموافقة' },
        ]);
        break;
      case 'rules_tip':
        setActions([{ id: 'rules_ok', label: 'فهمت — كمل ✓', primary: true }]);
        break;
      case 'final_checks':
        setActions([{ id: 'finish', label: 'خلصت الصرف ✓', primary: true }]);
        break;
      case 'done':
        setActions([
          { id: 'restart', label: 'ابدأ صرف جديد', primary: true },
          { id: 'home', label: 'العودة لشركات التأمين' },
        ]);
        break;
    }
    setPhase(p);
  }, [company, forms, onOpenReference]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    (async () => {
      await coachSay(
        `أهلاً يا فندم! 👋\n\nأنا **مرشد الصرف** — هسألك شوية أسئلة وأوجّهك للخطوة والنموذج الصح.\n\nهنصرف على **${company.nameAr}** — جاهز نبدأ؟`,
      );
      setPhaseActions('welcome');
    })();
  }, [coachSay, company.nameAr, setPhaseActions]);

  const goToFormPick = async () => {
    await coachSay('تمام! 👍\n\n**الخطوة التانية:** إيه نوع الروشتة أو النموذج اللي مع المريض؟\n\nاختار من الأزرار تحت — هورّيك النموذج المناسب من المستند.');
    setPhaseActions('form_pick');
  };

  const showFormDoc = async (form: string) => {
    const doc = pickMediaForForm(form, media, company.formMediaMap);
    setSelectedForm(form);
    setSelectedDoc(doc);
    let msg = `**${form}**\n\n`;
    if (doc) {
      msg += `ده **النموذج اللي هتستخدمه** — املأه حسب التعليمات:`;
    } else {
      msg += `مفيش صورة مطابقة في المستند — راجع **تبويب النماذج** أو اسأل مساعد لوتس.`;
    }
    if (rules?.prescriptionValidity) {
      msg += `\n\n⏱ صلاحية الروشتة: **${rules.prescriptionValidity}**`;
    }
    await coachSay(msg, doc ? { doc } : undefined);
    setPhaseActions('form_doc', { doc });
  };

  const showRulesTip = async (form: string | null) => {
    const bullets: string[] = [];
    if (rules?.copay) bullets.push(`التحمل: ${rules.copay}`);
    if (rules?.signatureRequired) bullets.push('يلزم **توقيع العميل** على النموذج');
    if (rules?.stampRequired) bullets.push('يلزم **ختم الطبيب/المستشفى**');
    if (rules?.diagnosisRequired) bullets.push('**التشخيص** إلزامي في الموافقة');
    if (rules?.alternativesPolicy) bullets.push(`البدائل: ${rules.alternativesPolicy}`);
    if (form && normalizeFormHint(form)) bullets.push(normalizeFormHint(form)!);
    if (rules?.importantNotes?.length) {
      bullets.push(...rules.importantNotes.slice(0, 2));
    }
    await coachSay(
      bullets.length
        ? '**قبل ما تقفل الفاتورة** — اتأكد من النقاط دي:'
        : 'تمام! اتأكد إن كل البيانات مطابقة للموافقة.',
      { bullets },
    );
    setPhaseActions('rules_tip');
  };

  const showFinalChecks = async () => {
    const items = buildFinalChecklist(company, selectedForm);
    setFinalChecks(Object.fromEntries(items.map((k) => [k, false])));
    await coachSay('**آخر خطوة:** علّم كل نقطة بعد ما تتأكد منها 👇');
    setPhaseActions('final_checks');
  };

  const handleAction = async (action: ActionBtn) => {
    if (action.href) return;
    pushUser(action.label);

    switch (action.id) {
      case 'start':
        await coachSay(
          '**أول خطوة: فحص الكارنية** 🪪\n\nهل الكارنية الإلكترونية **سارية** وتاريخها **النهاردة** (يوم الصرف)؟',
        );
        setPhaseActions('card_check');
        break;

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
            ? ['تأكد من صورة الكارنية من التطبيق وليس screenshot', 'تأكد أن التاريخ = يوم الصرف']
            : ['تأكد من بيانات العضوية قبل المتابعة'];
        const intro =
          action.id === 'no_card' && rules?.cardRequired
            ? '⚠️ **الكارنية مطلوبة** لهذه الشركة. اتبع التعليمات:'
            : 'مفيش مشكلة — اتبع **التعليمات دي** وظبط الكارنية:';
        await coachSay(intro, { bullets: tips });
        setPhaseActions('card_help');
        break;
      }

      case 'card_fixed':
        await goToFormPick();
        break;

      case 'form_unsure':
        await coachSay(
          forms.length
            ? `**الأنواع المتاحة لـ ${company.nameAr}:**\n\n${forms.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nاسأل المريض عن نوع الروشتة واختار من الأزرار.`
            : 'مفيش أنواع مسجلة — راجع المرجع أو اتصل بالخط الساخن.',
        );
        setPhaseActions('form_pick');
        break;

      default:
        if (action.id.startsWith('form-')) {
          const idx = Number(action.id.replace('form-', ''));
          await showFormDoc(forms[idx]);
        } else if (action.id === 'doc_ok') {
          if (company.approvalPortal || rules?.priorApprovalRequired) {
            await coachSay(
              `**الخطوة التالية: الموافقة**\n\nهل محتاج **موافقة** من **${company.approvalSystem || 'النظام'}** قبل الصرف؟`,
            );
            setPhaseActions('approval_check');
          } else {
            await showRulesTip(selectedForm);
          }
        } else if (action.id === 'doc_zoom' && selectedDoc) {
          setLightbox(selectedDoc);
        } else if (action.id === 'form_again') {
          setSelectedForm(null);
          setSelectedDoc(null);
          await coachSay('تمام — **اختار نوع الروشتة** تاني:');
          setPhaseActions('form_pick');
        } else if (action.id === 'need_approval') {
          await showApprovalStep();
        } else if (action.id === 'no_approval') {
          if (rules?.priorApprovalRequired) {
            await coachSay(
              `⚠️ **تنبيه:** ${company.nameAr} عادةً محتاجة موافقة.\n\n${rules.priorApprovalRequired}\n\nلو متأكد إن الصرف مباشر، كمل — وإلا خُد موافقة.`,
            );
          }
          await showRulesTip(selectedForm);
        } else if (action.id === 'got_approval') {
          await showRulesTip(selectedForm);
        } else if (action.id === 'approval_help') {
          await showApprovalHelp();
        } else if (action.id === 'rules_ok') {
          await showFinalChecks();
        } else if (action.id === 'finish') {
          const allDone = Object.values(finalChecks).every(Boolean);
          if (!allDone && Object.keys(finalChecks).length > 0) {
            await coachSay('⚠️ **لسه في نقاط ما اتعلمتش** — راجع القائمة وعلّم كل نقطة قبل الإغلاق.');
            setPhaseActions('final_checks');
            return;
          }
          await coachSay(`تمام يا فندم! 🎉\n\n**الصرف على ${company.nameAr} اتعمل صح.**\n\nبالتوفيق — وأي استفسار اسأل **مساعد لوتس** 👇`);
          setPhaseActions('done');
        } else if (action.id === 'restart') {
          setHistory([]);
          setSelectedForm(null);
          setSelectedDoc(null);
          setFinalChecks({});
          bootRef.current = false;
          await coachSay(
            `أهلاً تاني! 👋\n\nهنبدأ صرف جديد على **${company.nameAr}** — جاهز؟`,
          );
          setPhaseActions('welcome');
          bootRef.current = true;
        } else if (action.id === 'home') {
          break;
        }
        break;
    }
  };

  const showApprovalStep = async () => {
    const approvalPhotos = pickApprovalMedia(media);
    let msg = `**خُد الموافقة** من **${company.approvalSystem || 'النظام المعتمد'}**`;
    if (rules?.approvalValidity) msg += `\n\n⏱ صلاحية الموافقة: **${rules.approvalValidity}**`;
    if (rules?.importantNotes?.some((n) => n.includes('Yodawy') || n.includes('موافقة'))) {
      const note = rules.importantNotes.find((n) => n.includes('تاريخ') || n.includes('Yodawy'));
      if (note) msg += `\n\n💡 ${note}`;
    }
    msg += '\n\nبعد ما تاخد الموافقة، اضغط **خُدت الموافقة ✓**';
    await coachSay(msg, approvalPhotos[0] ? { doc: approvalPhotos[0], bullets: approvalPhotos.length > 1 ? ['شوف صور الموافقات في المرجع'] : undefined } : undefined);
    setPhaseActions('approval_portal');
  };

  const showApprovalHelp = async () => {
    const photos = pickApprovalMedia(media);
    const bullets = [
      company.approvalPortal ? `افتح البوابة: ${company.approvalSystem || 'الموافقات'}` : '',
      'أدخل كل الأدوية والجرعات والتشخيص',
      rules?.approvalValidity ? `الموافقة صالحة ${rules.approvalValidity}` : '',
    ].filter(Boolean);
    await coachSay('**خطوات الموافقة:**', {
      doc: photos[0],
      bullets,
    });
    setPhaseActions('approval_portal');
  };

  const finalChecklist = buildFinalChecklist(company, selectedForm);
  const allFinalDone = finalChecklist.length > 0 && finalChecklist.every((k) => finalChecks[k]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* Coach header */}
      <div className="sticky top-[52px] z-40 -mx-1 px-1 py-2 bg-[var(--color-bg-start)]/95 backdrop-blur-md border-b border-theme">
        <div className="flex items-center gap-3">
          <CompanyLogo company={company} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary text-sm truncate flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-lotus-500 shrink-0" />
              مرشد الصرف — {company.nameAr}
            </p>
            <p className="text-[11px] text-muted">هوجّهك خطوة بخطوة زي زميل في الفرع</p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary hover:bg-surface border border-theme"
          >
            <BookOpen className="w-3.5 h-3.5" />
            المرجع
          </button>
        </div>
        <PhaseProgress phase={phase} />
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {history.map((line) => (
          <ChatBubble key={line.id} line={line} color={color} onZoom={(doc) => setLightbox(doc)} />
        ))}

        {phase === 'final_checks' && finalChecklist.length > 0 && (
          <div className="mr-10 space-y-2">
            {finalChecklist.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFinalChecks((c) => ({ ...c, [item]: !c[item] }))}
                className={`w-full text-right flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors ${
                  finalChecks[item]
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-primary'
                    : 'border-theme bg-surface/50 text-muted hover:bg-surface'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                  finalChecks[item] ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-lotus-500/40'
                }`}>
                  {finalChecks[item] ? <Check className="w-4 h-4" /> : null}
                </span>
                {item}
              </button>
            ))}
          </div>
        )}

        {typing && (
          <div className="flex gap-2 items-center text-muted text-sm mr-2">
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

      {/* Action buttons — sticky bottom */}
      <div className="sticky bottom-0 z-40 -mx-1 px-1 pt-2 pb-4 bg-gradient-to-t from-[var(--color-bg-start)] via-[var(--color-bg-start)] to-transparent">
        <AnimatePresence mode="popLayout">
          {!typing && actions.length > 0 && (
            <motion.div
              key={actions.map((a) => a.id).join(',')}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex flex-wrap gap-2 justify-end"
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
                    <ChevronLeft className="w-4 h-4" />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action)}
                    disabled={action.id === 'finish' && !allFinalDone && finalChecklist.length > 0}
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

function ChatBubble({
  line,
  color,
  onZoom,
}: {
  line: ChatLine;
  color: string;
  onZoom: (doc: CompanyMedia) => void;
}) {
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
          style={isCoach ? { borderRightColor: `${color}40`, borderRightWidth: 3 } : undefined}
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
          <div className="rounded-xl border border-theme overflow-hidden bg-black/10 max-w-sm">
            <button type="button" onClick={() => onZoom(line.doc!)} className="block w-full group relative">
              <img
                src={line.doc.url}
                alt={line.doc.title}
                className="w-full max-h-48 sm:max-h-64 object-contain bg-white/5"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </span>
            </button>
            <p className="text-[11px] text-muted px-2 py-1.5 truncate">{line.doc.title}</p>
            {line.doc.links && line.doc.links.length > 0 && (
              <MediaLinks links={line.doc.links} accentColor={color} />
            )}
          </div>
        )}
      </div>
    </motion.div>
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

function PhaseProgress({ phase }: { phase: Phase }) {
  const steps: { id: Phase; label: string }[] = [
    { id: 'card_check', label: 'كارنية' },
    { id: 'form_pick', label: 'نموذج' },
    { id: 'approval_check', label: 'موافقة' },
    { id: 'final_checks', label: 'تأكيد' },
    { id: 'done', label: 'تم' },
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
            <span className={`text-[9px] ${active ? 'text-lotus-600 dark:text-lotus-400' : 'text-muted'}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function normalizeFormHint(form: string): string | null {
  const n = form.toLowerCase();
  if (n.includes('أصفر') || n.includes('اصفر')) return 'املأ **النموذج الأصفر بالكربون** بالكامل';
  if (n.includes('أزرق') || n.includes('ازرق')) return 'استخدم **النموذج الأزرق** حسب تعليمات الشركة';
  if (n.includes('e-form') || n.includes('yodawy') || n.includes('يوداوي')) return 'الصرف عبر **E-Form / يوداوي** — تاريخ البيع = تاريخ الموافقة';
  if (n.includes('خارج')) return 'تأكد إن **الروشتة الخارجية** مسموحة على الكارنية';
  return null;
}

function buildFinalChecklist(company: Company, form: string | null): string[] {
  const r = company.rules;
  const items: string[] = [
    'الكارنية / العضوية سارية',
    form ? `النموذج (${form}) مكتمل` : 'النموذج مكتمل',
  ];
  if (r?.signatureRequired) items.push('توقيع العميل موجود');
  if (r?.stampRequired) items.push('ختم الطبيب / المستشفى موجود');
  if (r?.diagnosisRequired) items.push('التشخيص مدخل في الموافقة');
  if (r?.copay) items.push('نسبة التحمل مطابقة للكارنية');
  items.push('الكميات والجرعات مطابقة للموافقة');
  return items;
}

import { useMemo, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';
import type { CoachCopyBundle, CoachPhase, Company } from '../../types';
import { COACH_FIELD_LABELS, DEFAULT_COACH, type CoachSection } from '../../data/coachDefaults';
import { mergeCoachCopy, resolveCoachText } from '../../utils/coachCopy';
import { LEGACY_ANSWER_KEYS, TOGGLEABLE_STEPS, cleanBullet, isStepOn, stepPhotos } from '../../utils/coachSteps';
import { galleryMedia } from '../../utils/mediaFilters';
import { CHECKLIST_ITEMS, buildRulesTipBullets, checklistAuto } from '../../hooks/useCoachCopy';
import CoachMediaEditor from '../CoachMediaEditor';
import LinesField from './LinesField';
import PhotoPicker from './PhotoPicker';

type Extra = 'cardInstructions' | 'forms' | 'rulesTip' | 'prohibitions' | 'checklist';

interface StepDef {
  phase: CoachPhase;
  title: string;
  note?: string;
  messages: string[];
  buttons: string[];
  ui?: string[];
  extra?: Extra;
  photos?: boolean;
}

const STEPS: StepDef[] = [
  { phase: 'welcome', title: 'الترحيب', messages: ['welcome', 'welcomeRestart'], buttons: ['start', 'ref'], ui: ['coachTitle', 'coachSubtitle'], photos: true },
  { phase: 'card_check', title: 'فحص الكارنية', messages: ['cardCheckIntro'], buttons: ['cardOk', 'cardBad', 'noCard'], photos: true },
  {
    phase: 'card_help',
    title: 'مشكلة الكارنية',
    note: 'تظهر لما الصيدلي يقول إن في مشكلة أو مفيش كارنية',
    messages: ['cardHelpProblem', 'cardHelpNoCard', 'cardHelpDefault1', 'cardHelpDefault2', 'cardHelpDefaultNoCard'],
    buttons: ['cardFixed', 'call'],
    extra: 'cardInstructions',
    photos: true,
  },
  {
    phase: 'form_pick',
    title: 'نوع الروشتة والنموذج',
    messages: ['formPickIntro', 'formDocHasImage', 'formDocNoImage', 'formDocValidity', 'formUnsureList', 'formUnsureEmpty', 'formAgain'],
    buttons: ['formUnsure', 'docOk', 'docZoom', 'formAgain'],
    extra: 'forms',
  },
  {
    phase: 'approval_check',
    title: 'سؤال الموافقة',
    note: 'تلقائياً يظهر لو للشركة بوابة موافقات أو «موافقة مسبقة» في الشروط — تقدر تخليه مطلوب دايماً أو تقفله من المفتاح',
    messages: ['approvalCheckIntro', 'approvalNoWarning'],
    buttons: ['needApproval', 'noApproval'],
    photos: true,
  },
  {
    phase: 'approval_portal',
    title: 'أخذ الموافقة',
    messages: ['approvalStep', 'approvalStepValidity', 'approvalStepFooter', 'approvalHelpTitle', 'approvalHelpPortal', 'approvalHelpEnterMeds', 'approvalHelpValidity'],
    buttons: ['gotApproval', 'openPortal', 'approvalHelp'],
    photos: true,
  },
  { phase: 'rules_tip', title: 'قبل ما تقفل الفاتورة', messages: ['rulesTipTitle', 'rulesTipEmpty'], buttons: ['rulesOk'], extra: 'rulesTip', photos: true },
  {
    phase: 'prohibitions',
    title: 'محظورات الصرف',
    note: 'تظهر للصيدلي بعد «قبل ما تقفل الفاتورة» — لو القائمة فاضية الخطوة مش هتظهر',
    messages: ['prohibitionsTitle'],
    buttons: ['prohibitionsOk'],
    extra: 'prohibitions',
    photos: true,
  },
  {
    phase: 'final_checks',
    title: 'التأكيد النهائي',
    note: 'تلقائياً بنود التوقيع / الختم / التشخيص / التحمل تظهر حسب «شروط الصرف» — تقدر تشغّل أو تقفل أي بند',
    messages: ['finalChecksTitle', 'finishIncomplete'],
    buttons: ['finish'],
    extra: 'checklist',
    photos: true,
  },
  { phase: 'done', title: 'انتهاء الصرف', messages: ['finishSuccess'], buttons: ['restart', 'home'], photos: true },
];

interface Props {
  company: Company;
  globalCoach?: CoachCopyBundle;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
}

export default function CoachStepsEditor({ company, globalCoach, adminToken, onPatch }: Props) {
  const [open, setOpen] = useState<CoachPhase | null>(null);
  const [pickerFor, setPickerFor] = useState<CoachPhase | null>(null);

  const base = useMemo(() => mergeCoachCopy(globalCoach, undefined), [globalCoach]);
  const effective = useMemo(() => mergeCoachCopy(globalCoach, company.coachCopy), [globalCoach, company.coachCopy]);
  const msg = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(effective, 'messages', key, 'ar', { company: company.nameAr, ...vars });
  const media = galleryMedia(company.media || []);

  const setCopy = (section: CoachSection, key: string, text: string | null) =>
    onPatch((c) => {
      const copy: CoachCopyBundle = { ...(c.coachCopy || {}) };
      const sec = { ...(copy[section] || {}) };
      if (text === null || text === base[section][key]?.ar) delete sec[key];
      else sec[key] = { ar: text, en: base[section][key]?.en ?? DEFAULT_COACH[section][key]?.en ?? '' };
      if (Object.keys(sec).length) copy[section] = sec;
      else delete copy[section];
      return { ...c, coachCopy: Object.keys(copy).length ? copy : undefined };
    });

  const writePhotos = (phase: CoachPhase, fn: (ids: string[]) => string[], extra?: (c: Company) => Company) =>
    onPatch((c0) => {
      const c = extra ? extra(c0) : c0;
      const current = stepPhotos(c, galleryMedia(c.media || []), phase).map((m) => m.id);
      const answers = { ...(c.coachAnswerMedia || {}) };
      for (const k of LEGACY_ANSWER_KEYS[phase] || []) delete answers[k];
      return {
        ...c,
        stepMediaMap: { ...(c.stepMediaMap || {}), [phase]: fn(current) },
        coachAnswerMedia: Object.keys(answers).length ? answers : undefined,
      };
    });

  const setStepOn = (phase: CoachPhase, v: boolean | undefined) =>
    onPatch((c) => {
      const map = { ...(c.coachSteps || {}) };
      if (v === undefined) delete map[phase];
      else map[phase] = v;
      return { ...c, coachSteps: Object.keys(map).length ? map : undefined };
    });

  // a render helper, not a component: keeps the same <input> between renders so typing keeps focus
  const copyField = (section: CoachSection, k: string) => {
    const meta = COACH_FIELD_LABELS[section][k] || { label: k };
    const own = company.coachCopy?.[section]?.[k]?.ar;
    const value = own ?? base[section][k]?.ar ?? '';
    const multiline = section === 'messages' && (meta.multiline || value.length > 60 || value.includes('\n'));
    const cls =
      'w-full py-2 px-3 rounded-lg bg-black/20 border text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50 ' +
      (own !== undefined ? 'border-lotus-500/40' : 'border-white/10');
    return (
      <div key={`${section}.${k}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-xs text-slate-400">
            {meta.label.replace(/^(زر|تأكيد|مرحلة): /, '')}
            {meta.hint && <span className="text-[10px] text-muted mr-1">({meta.hint})</span>}
          </label>
          {own !== undefined && (
            <button
              type="button"
              onClick={() => setCopy(section, k, null)}
              className="flex items-center gap-1 text-[10px] text-muted hover:text-amber-400"
              title="رجوع للنص العام"
            >
              <RotateCcw className="w-3 h-3" />
              النص العام
            </button>
          )}
        </div>
        {multiline ? (
          <textarea
            rows={Math.min(8, Math.max(2, value.split('\n').length + 1))}
            value={value}
            onChange={(e) => setCopy(section, k, e.target.value)}
            className={cls}
          />
        ) : (
          <input value={value} onChange={(e) => setCopy(section, k, e.target.value)} className={cls} />
        )}
      </div>
    );
  };

  const renderExtra = (extra: Extra) => {
    switch (extra) {
      case 'cardInstructions':
        return (
          <LinesField
            label="تعليمات الكارنية (نقطة في كل سطر)"
            value={company.cardInstructions || []}
            onChange={(v) => onPatch((c) => ({ ...c, cardInstructions: v }))}
          />
        );
      case 'forms':
        return (
          <div className="space-y-3">
            <LinesField
              label="أنواع الروشتات (كل سطر = زر يختاره الصيدلي)"
              value={company.forms || []}
              onChange={(v) => onPatch((c) => ({ ...c, forms: v }))}
            />
            <CoachMediaEditor company={company} adminToken={adminToken} onPatch={onPatch} />
          </div>
        );
      case 'rulesTip': {
        const custom = company.rulesTipBullets !== undefined;
        return (
          <div className="space-y-1">
            <LinesField
              label="النقاط (نقطة في كل سطر) — عدّل أو امسح أو زوّد زي ما تحب"
              value={custom ? company.rulesTipBullets! : buildRulesTipBullets(company, msg)}
              onChange={(v) => onPatch((c) => ({ ...c, rulesTipBullets: v }))}
            />
            <p className="text-[11px] text-muted">
              {custom ? (
                <button
                  type="button"
                  onClick={() => onPatch((c) => ({ ...c, rulesTipBullets: undefined }))}
                  className="inline-flex items-center gap-1 hover:text-amber-400"
                >
                  <RotateCcw className="w-3 h-3" />
                  رجوع للتلقائي (من نسبة التحمل والتوقيع والختم والتشخيص والبدائل وأول سطرين من الملاحظات الهامة)
                </button>
              ) : (
                'النقاط دي متجمعة تلقائي من «شروط الصرف» — أول ما تعدّل هنا هتبقى النقاط بتاعتك انت بالظبط.'
              )}
            </p>
          </div>
        );
      }
      case 'prohibitions':
        return (
          <LinesField
            label="المحظورات (نقطة في كل سطر)"
            value={(company.rules?.prohibitions || []).map(cleanBullet).filter(Boolean)}
            onChange={(v) => onPatch((c) => ({ ...c, rules: { ...c.rules, prohibitions: v } }))}
          />
        );
      case 'checklist':
        return (
          <div className="space-y-3">
            <p className="text-[11px] text-muted">
              شغّل البنود اللي الصيدلي لازم يعلّم عليها قبل ما يخلص، واقفل اللي مش مطلوبة للشركة دي.
            </p>
            {CHECKLIST_ITEMS.map((k) => {
              const own = company.coachChecklist?.[k];
              const on = own ?? checklistAuto(company, k);
              return (
                <div key={k} className={`rounded-lg p-3 space-y-2 ${on ? 'bg-white/5' : 'bg-white/[0.02] opacity-60'}`}>
                  <RequiredSwitch
                    on={on}
                    automatic={own === undefined}
                    onChange={(v) => onPatch((c) => ({ ...c, coachChecklist: { ...(c.coachChecklist || {}), [k]: v } }))}
                    onReset={() =>
                      onPatch((c) => {
                        const map = { ...(c.coachChecklist || {}) };
                        delete map[k];
                        return { ...c, coachChecklist: Object.keys(map).length ? map : undefined };
                      })
                    }
                  />
                  {copyField('checklist', k)}
                  {k === 'formComplete' && copyField('checklist', 'formCompleteGeneric')}
                </div>
              );
            })}
            <LinesField
              label="بنود إضافية لازم الصيدلي يعلّم عليها (بند في كل سطر)"
              value={company.coachChecklistExtra || []}
              placeholder="مثال: صورة الكارنية مرفقة مع الفاتورة"
              onChange={(v) => onPatch((c) => ({ ...c, coachChecklistExtra: v.length ? v : undefined }))}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted leading-relaxed">
        دي خطوات المرشد بنفس ترتيب ما الصيدلي بيشوفها. افتح أي خطوة وعدّل رسالتها وأزرارها ونقاطها وصورها. أي نص
        تغيّره هنا بيخص الشركة دي بس (بإطار ملوّن)، و«النص العام» يرجّعه للنص الموحّد.
      </p>

      {STEPS.map((step, i) => {
        const isOpen = open === step.phase;
        const toggleable = TOGGLEABLE_STEPS.includes(step.phase);
        const stepOn = isStepOn(company, step.phase);
        const photos = step.photos ? stepPhotos(company, media, step.phase) : [];
        const automatic = step.photos && !(company.stepMediaMap && step.phase in company.stepMediaMap) && photos.length > 0;
        const edited = [...step.messages.map((k) => ['messages', k]), ...step.buttons.map((k) => ['buttons', k])].some(
          ([s, k]) => company.coachCopy?.[s as CoachSection]?.[k] !== undefined,
        );
        return (
          <div key={step.phase} className={`rounded-xl border ${isOpen ? 'border-lotus-500/40' : 'border-white/10'} overflow-hidden ${toggleable && !stepOn ? 'opacity-60' : ''}`}>
            <div className="flex items-center bg-white/5">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : step.phase)}
              className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 text-right"
            >
              <span className="w-7 h-7 rounded-full bg-lotus-500/25 text-lotus-300 text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 font-medium text-sm">{step.title}</span>
              {edited && <span className="text-[10px] px-2 py-0.5 rounded-full bg-lotus-500/20 text-lotus-300">معدّلة</span>}
              {photos.length > 0 && <span className="text-[10px] text-muted">🖼 {photos.length}</span>}
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {toggleable && (
              <div className="px-3 shrink-0">
                <RequiredSwitch
                  on={stepOn}
                  automatic={company.coachSteps?.[step.phase] === undefined}
                  onChange={(v) => setStepOn(step.phase, v)}
                  onReset={() => setStepOn(step.phase, undefined)}
                />
              </div>
            )}
            </div>

            {isOpen && (
              <div className="p-4 space-y-4">
                {step.note && <p className="text-[11px] text-amber-300/80">{step.note}</p>}
                {toggleable && !stepOn && (
                  <p className="text-[11px] text-amber-300 rounded-lg bg-amber-500/10 px-3 py-2">
                    الخطوة دي مقفولة للشركة دي — الصيدلي مش هيشوفها وهيروح على الخطوة اللي بعدها.
                  </p>
                )}

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-lotus-300">💬 رسائل المرشد</h5>
                  {step.messages.map((k) => copyField('messages', k))}
                  {step.ui?.map((k) => copyField('ui', k))}
                </div>

                {step.extra && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-lotus-300">📋 المحتوى</h5>
                    {renderExtra(step.extra)}
                  </div>
                )}

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-lotus-300">🔘 الأزرار</h5>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {step.buttons.map((k) => copyField('buttons', k))}
                  </div>
                </div>

                {step.photos && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-lotus-300">
                      🖼 الصور
                      {automatic && <span className="font-normal text-muted mr-2">(مختارة تلقائي — تقدر تشيلها أو تغيّرها)</span>}
                    </h5>
                    <div className="flex flex-wrap items-center gap-2">
                      {photos.map((m) => (
                        <div key={m.id} className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                          <img src={m.url} alt={m.title} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            title="إزالة من الخطوة"
                            onClick={() => writePhotos(step.phase, (ids) => ids.filter((x) => x !== m.id))}
                            className="absolute top-0.5 left-0.5 p-0.5 rounded bg-black/70"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPickerFor(step.phase)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-xs hover:bg-white/15"
                      >
                        <Camera className="w-4 h-4" />
                        إضافة / اختيار صور
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {pickerFor && (
        <PhotoPicker
          company={company}
          adminToken={adminToken}
          selected={stepPhotos(company, media, pickerFor).map((m) => m.id)}
          onToggle={(id) => writePhotos(pickerFor, (ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
          onUploaded={(items) =>
            writePhotos(
              pickerFor,
              (ids) => [...ids, ...items.map((m) => m.id)],
              (c) => ({ ...c, media: [...(c.media || []), ...items] }),
            )
          }
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}

function RequiredSwitch({
  on,
  automatic,
  onChange,
  onReset,
}: {
  on: boolean;
  automatic: boolean;
  onChange: (v: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        title={on ? 'مطلوب — اضغط للإيقاف' : 'غير مطلوب — اضغط للتشغيل'}
        onClick={() => onChange(!on)}
        className="flex items-center gap-2"
      >
        <span className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-white/20'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'right-0.5' : 'right-[22px]'}`} />
        </span>
        <span className={`text-xs font-medium ${on ? 'text-emerald-300' : 'text-muted'}`}>{on ? 'مطلوب' : 'غير مطلوب'}</span>
      </button>
      {automatic ? (
        <span className="text-[10px] text-muted">(تلقائي)</span>
      ) : (
        <button type="button" onClick={onReset} title="رجوع للتلقائي" className="text-muted hover:text-amber-400">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

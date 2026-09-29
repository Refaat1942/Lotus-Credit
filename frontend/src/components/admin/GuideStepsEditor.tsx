import { RotateCcw } from 'lucide-react';
import type { AppCopyBundle, Company, GuideCopyBundle } from '../../types';
import { useAppCopy } from '../../hooks/useAppCopy';
import { buildGuideSteps } from '../../utils/guideSteps';
import LinesField from './LinesField';

interface Props {
  company: Company;
  ui?: AppCopyBundle;
  guide?: GuideCopyBundle;
  onPatch: (fn: (c: Company) => Company) => void;
}

export default function GuideStepsEditor({ company, ui, guide, onPatch }: Props) {
  const { g } = useAppCopy(ui, guide);
  const steps = buildGuideSteps(company, g);

  const setPoints = (key: string, lines: string[] | undefined) =>
    onPatch((c) => {
      const map = { ...(c.guideStepPoints || {}) };
      if (lines === undefined) delete map[key];
      else map[key] = lines;
      return { ...c, guideStepPoints: Object.keys(map).length ? map : undefined };
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted leading-relaxed">
        النقاط اللي بتظهر مرقّمة (1، 2، 3…) تحت كل خطوة في تبويب «خطوات الصرف». اكتب نقطة في كل سطر. لو سبت الخانة
        فاضية مش هيظهر تحت الخطوة نقاط.
      </p>
      {steps.map((step, i) => (
        <div key={step.key} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-lotus-500/25 text-lotus-300 text-sm font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <p className="text-sm font-medium flex-1 min-w-0 truncate">
              {step.title} <span className="text-muted font-normal">— {step.detail}</span>
            </p>
            {step.custom && (
              <button
                type="button"
                onClick={() => setPoints(step.key, undefined)}
                className="flex items-center gap-1 text-[10px] text-muted hover:text-amber-400 shrink-0"
                title="رجوع للنقاط التلقائية"
              >
                <RotateCcw className="w-3 h-3" />
                التلقائي
              </button>
            )}
          </div>
          <LinesField
            key={`${company.id}-${step.key}`}
            value={step.points}
            placeholder="مثال: املأ النموذج بالكامل"
            rows={Math.max(2, step.points.length + 1)}
            onChange={(v) => setPoints(step.key, v)}
          />
        </div>
      ))}
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { CoachCopyBundle, LocalizedString } from '../types';
import {
  COACH_SECTION_LABELS,
  DEFAULT_COACH,
  type CoachSection,
} from '../data/coachDefaults';

interface CoachCopyEditorProps {
  title: string;
  copy?: CoachCopyBundle;
  onChange: (copy: CoachCopyBundle | undefined) => void;
  defaultOpen?: boolean;
}

const SECTIONS: CoachSection[] = ['messages', 'buttons', 'checklist', 'ui'];

function isOverridden(
  section: CoachSection,
  key: string,
  copy: CoachCopyBundle | undefined,
): boolean {
  const val = copy?.[section]?.[key];
  return !!(val?.ar || val?.en);
}

export default function CoachCopyEditor({
  title,
  copy,
  onChange,
  defaultOpen = false,
}: CoachCopyEditorProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeSection, setActiveSection] = useState<CoachSection>('messages');

  const updateField = (
    section: CoachSection,
    key: string,
    lang: 'ar' | 'en',
    value: string,
  ) => {
    const defaults = DEFAULT_COACH[section][key];
    const current = copy?.[section]?.[key] || {};
    const nextEntry: LocalizedString = {
      ar: lang === 'ar' ? value : (current.ar ?? defaults?.ar ?? ''),
      en: lang === 'en' ? value : (current.en ?? defaults?.en ?? ''),
    };

    const trimmedSameAsDefault =
      nextEntry.ar === (defaults?.ar ?? '') && nextEntry.en === (defaults?.en ?? '');

    const nextSection = { ...(copy?.[section] || {}) };
    if (trimmedSameAsDefault) {
      delete nextSection[key];
    } else {
      nextSection[key] = nextEntry;
    }

    const next: CoachCopyBundle = { ...(copy || {}) };
    if (Object.keys(nextSection).length === 0) {
      delete next[section];
    } else {
      next[section] = nextSection;
    }

    const hasAny = SECTIONS.some((s) => next[s] && Object.keys(next[s]!).length > 0);
    onChange(hasAny ? next : undefined);
  };

  const resetField = (section: CoachSection, key: string) => {
    const nextSection = { ...(copy?.[section] || {}) };
    delete nextSection[key];
    const next: CoachCopyBundle = { ...(copy || {}) };
    if (Object.keys(nextSection).length === 0) {
      delete next[section];
    } else {
      next[section] = nextSection;
    }
    const hasAny = SECTIONS.some((s) => next[s] && Object.keys(next[s]!).length > 0);
    onChange(hasAny ? next : undefined);
  };

  const resetAll = () => onChange(undefined);

  const keys = Object.keys(DEFAULT_COACH[activeSection]);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-right"
      >
        <span className="font-bold">{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveSection(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSection === s
                      ? 'bg-lotus-500/25 text-lotus-300 border border-lotus-500/30'
                      : 'bg-white/5 text-muted hover:text-primary'
                  }`}
                >
                  {COACH_SECTION_LABELS[s].ar}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="flex items-center gap-1 text-xs text-muted hover:text-amber-400"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة الكل للافتراضي
            </button>
          </div>

          <p className="text-xs text-muted">
            عدّل نصوص المرشد التفاعلي. استخدم {'{company}'} و {'{system}'} و {'{validity}'} كمتغيرات.
            اترك الحقل فارغاً لاستخدام الافتراضي.
          </p>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {keys.map((key) => {
              const defaults = DEFAULT_COACH[activeSection][key];
              const override = copy?.[activeSection]?.[key];
              const overridden = isOverridden(activeSection, key, copy);
              return (
                <div
                  key={key}
                  className={`rounded-xl p-3 space-y-2 ${
                    overridden ? 'bg-lotus-500/10 border border-lotus-500/20' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-lotus-400">{key}</code>
                    {overridden && (
                      <button
                        type="button"
                        onClick={() => resetField(activeSection, key)}
                        className="text-[10px] text-muted hover:text-amber-400"
                      >
                        إعادة للافتراضي
                      </button>
                    )}
                  </div>
                  <label className="block text-[11px] text-muted">عربي</label>
                  <textarea
                    rows={Math.min(4, Math.max(2, (override?.ar || defaults?.ar || '').split('\n').length))}
                    value={override?.ar ?? defaults?.ar ?? ''}
                    onChange={(e) => updateField(activeSection, key, 'ar', e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/40"
                  />
                  <label className="block text-[11px] text-muted">English</label>
                  <textarea
                    rows={Math.min(4, Math.max(2, (override?.en || defaults?.en || '').split('\n').length))}
                    value={override?.en ?? defaults?.en ?? ''}
                    onChange={(e) => updateField(activeSection, key, 'en', e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/40"
                    dir="ltr"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

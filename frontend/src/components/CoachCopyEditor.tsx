import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { CoachCopyBundle, LocalizedString } from '../types';
import { DEFAULT_COACH, type CoachSection } from '../data/coachDefaults';

interface CoachCopyEditorProps {
  copy?: CoachCopyBundle;
  onChange: (copy: CoachCopyBundle | undefined) => void;
}

const SECTIONS: { id: CoachSection; label: string }[] = [
  { id: 'messages', label: 'رسائل' },
  { id: 'buttons', label: 'أزرار' },
  { id: 'checklist', label: 'قائمة التأكيد' },
  { id: 'ui', label: 'عناوين' },
];

export default function CoachCopyEditor({ copy, onChange }: CoachCopyEditorProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CoachSection>('messages');

  const updateField = (section: CoachSection, key: string, value: string) => {
    const defaults = DEFAULT_COACH[section][key];
    const current = copy?.[section]?.[key] || {};
    const nextEntry: LocalizedString = {
      ar: value,
      en: current.en ?? defaults?.en ?? '',
    };

    if (value === (defaults?.ar ?? '')) {
      const nextSection = { ...(copy?.[section] || {}) };
      delete nextSection[key];
      const next: CoachCopyBundle = { ...(copy || {}) };
      if (Object.keys(nextSection).length === 0) delete next[section];
      else next[section] = nextSection;
      const hasAny = SECTIONS.some((s) => next[s.id] && Object.keys(next[s.id]!).length > 0);
      onChange(hasAny ? next : undefined);
      return;
    }

    const nextSection = { ...(copy?.[section] || {}), [key]: nextEntry };
    onChange({ ...(copy || {}), [section]: nextSection });
  };

  const keys = Object.keys(DEFAULT_COACH[activeSection]);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-right"
      >
        <span className="text-sm font-medium">تعديل نصوص المرشد (اختياري — متقدم)</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="flex flex-wrap gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1 rounded-lg text-xs ${
                  activeSection === s.id ? 'bg-lotus-500/25 text-lotus-300' : 'bg-white/5 text-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="mr-auto flex items-center gap-1 text-xs text-muted hover:text-amber-400"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة الكل
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {keys.map((key) => {
              const defaults = DEFAULT_COACH[activeSection][key];
              const override = copy?.[activeSection]?.[key];
              return (
                <div key={key}>
                  <code className="text-[10px] text-lotus-400">{key}</code>
                  <textarea
                    rows={2}
                    value={override?.ar ?? defaults?.ar ?? ''}
                    onChange={(e) => updateField(activeSection, key, e.target.value)}
                    className="w-full mt-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
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

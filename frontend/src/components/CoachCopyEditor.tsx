import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { CoachCopyBundle } from '../types';
import {
  COACH_FIELD_LABELS,
  COACH_SECTION_LABELS,
  DEFAULT_COACH,
  type CoachSection,
} from '../data/coachDefaults';
import StringCopyEditor from './admin/StringCopyEditor';

interface CoachCopyEditorProps {
  copy?: CoachCopyBundle;
  onChange: (copy: CoachCopyBundle | undefined) => void;
  defaultOpen?: boolean;
}

const SECTIONS: CoachSection[] = ['messages', 'buttons', 'checklist', 'ui'];

export default function CoachCopyEditor({ copy, onChange, defaultOpen = false }: CoachCopyEditorProps) {
  const [open, setOpen] = useState(defaultOpen);

  const flatDefaults = (section: CoachSection) =>
    Object.fromEntries(Object.entries(DEFAULT_COACH[section]).map(([k, v]) => [k, v.ar]));

  const flatValue = (section: CoachSection) => {
    if (!copy?.[section]) return undefined;
    return Object.fromEntries(
      Object.entries(copy[section]!).map(([k, v]) => [k, v.ar]),
    );
  };

  const setSection = (section: CoachSection, value: Record<string, string> | undefined) => {
    const next: CoachCopyBundle = { ...(copy || {}) };
    if (!value) {
      delete next[section];
    } else {
      next[section] = Object.fromEntries(
        Object.entries(value).map(([k, ar]) => [
          k,
          { ar, en: copy?.[section]?.[k]?.en ?? DEFAULT_COACH[section][k]?.en ?? '' },
        ]),
      );
    }
    const hasAny = SECTIONS.some((s) => next[s] && Object.keys(next[s]!).length > 0);
    onChange(hasAny ? next : undefined);
  };

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-right"
      >
        <span className="text-sm font-medium">نصوص المرشد التفاعلي (كل الأسئلة والأزرار)</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="flex items-center gap-1 text-xs text-muted hover:text-amber-400"
            >
              <RotateCcw className="w-3 h-3" />
              إعادة الكل للافتراضي
            </button>
          </div>
          {SECTIONS.map((section) => (
            <StringCopyEditor
              key={section}
              title={COACH_SECTION_LABELS[section].ar}
              defaults={flatDefaults(section)}
              labels={COACH_FIELD_LABELS[section] || {}}
              value={flatValue(section)}
              onChange={(v) => setSection(section, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

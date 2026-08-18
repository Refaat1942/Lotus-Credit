import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import type { CopyFieldMeta } from '../data/appDefaults';

interface StringCopyEditorProps {
  title: string;
  defaults: Record<string, string>;
  labels: Record<string, CopyFieldMeta>;
  value?: Record<string, string>;
  onChange: (value: Record<string, string> | undefined) => void;
  defaultOpen?: boolean;
}

export default function StringCopyEditor({
  title,
  defaults,
  labels,
  value,
  onChange,
  defaultOpen = false,
}: StringCopyEditorProps) {
  const [open, setOpen] = useState(defaultOpen);

  const update = (key: string, text: string) => {
    const def = defaults[key] ?? '';
    const next = { ...(value || {}) };
    if (text === def) delete next[key];
    else next[key] = text;
    onChange(Object.keys(next).length ? next : undefined);
  };

  const resetAll = () => onChange(undefined);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-right"
      >
        <span className="text-sm font-medium">{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="flex justify-end">
            <button type="button" onClick={resetAll} className="flex items-center gap-1 text-xs text-muted hover:text-amber-400">
              <RotateCcw className="w-3 h-3" />
              إعادة للافتراضي
            </button>
          </div>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {Object.keys(defaults).map((key) => {
              const meta = labels[key] || { label: key };
              const current = value?.[key] ?? defaults[key];
              const overridden = value?.[key] !== undefined && value[key] !== defaults[key];
              return (
                <div key={key} className={`rounded-lg p-3 ${overridden ? 'bg-lotus-500/10 border border-lotus-500/20' : 'bg-white/5'}`}>
                  <div className="flex justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-primary">{meta.label}</label>
                    <code className="text-[10px] text-muted">{key}</code>
                  </div>
                  {meta.hint && <p className="text-[10px] text-muted mb-1">{meta.hint}</p>}
                  {meta.multiline ? (
                    <textarea
                      rows={3}
                      value={current}
                      onChange={(e) => update(key, e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                    />
                  ) : (
                    <input
                      value={current}
                      onChange={(e) => update(key, e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ListEditorProps {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  defaultOpen?: boolean;
}

export function ListEditor({ title, items, onChange, placeholder, defaultOpen = false }: ListEditorProps) {
  const [open, setOpen] = useState(defaultOpen);
  const text = items.join('\n');

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-right"
      >
        <span className="text-sm font-medium">{title} ({items.length})</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 border-t border-white/10">
          <textarea
            rows={Math.min(12, Math.max(4, items.length + 1))}
            value={text}
            onChange={(e) => onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
            placeholder={placeholder}
            className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
          <p className="text-[10px] text-muted mt-1">سطر لكل عنصر</p>
        </div>
      )}
    </div>
  );
}

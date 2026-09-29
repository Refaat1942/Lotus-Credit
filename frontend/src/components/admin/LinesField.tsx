import { useState } from 'react';

/**
 * One item per line. Keeps the raw text locally so pressing Enter works while typing;
 * only non-empty lines are reported.
 */
export default function LinesField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label?: string;
  hint?: string;
  value: string[];
  onChange: (lines: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [text, setText] = useState(value.join('\n'));
  const [focused, setFocused] = useState(false);
  const clean = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

  // pick up changes made elsewhere (e.g. "reset to automatic"), but never while the admin is typing
  if (!focused && text !== value.join('\n')) setText(value.join('\n'));

  return (
    <div>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <textarea
        rows={rows ?? Math.min(12, Math.max(3, text.split('\n').length + 1))}
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(clean(e.target.value));
        }}
        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
      />
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

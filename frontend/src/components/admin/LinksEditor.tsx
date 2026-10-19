import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Company, CompanyLink } from '../../types';
import { resolveLink } from '../../utils/links';

const TYPES: { id: CompanyLink['type']; label: string; placeholder: string }[] = [
  { id: 'portal', label: 'لينك (موقع / درايف / بوابة)', placeholder: 'https://drive.google.com/...' },
  { id: 'phone', label: 'رقم تليفون', placeholder: '19097' },
  { id: 'email', label: 'إيميل', placeholder: 'name@company.com' },
];

/** Older links may hold the address in the title; show them split so each can be renamed. */
function asRow(link: CompanyLink): CompanyLink {
  let { label, url, type } = link;
  const legacy = !url.trim() || ['portal', 'email', 'phone', 'website'].includes(url.trim().toLowerCase());
  const r = legacy ? resolveLink(link) : null;
  if (r?.text) {
    label = r.label;
    url = r.text;
    type = r.type as CompanyLink['type'];
  } else if (legacy) {
    url = '';
  }
  url = url.replace(/^mailto:/, '').replace(/^tel:/, '');
  if (type === 'website') type = 'portal';
  return { ...link, label, url, type: TYPES.some((t) => t.id === type) ? type : 'portal' };
}

/** The company's important links: a name the branches see, the address, and its kind. */
export default function LinksEditor({ company, onPatch }: { company: Company; onPatch: (fn: (c: Company) => Company) => void }) {
  const rows = (company.links || []).map(asRow);
  const write = (next: CompanyLink[]) => onPatch((c) => ({ ...c, links: next }));
  const update = (i: number, patch: Partial<CompanyLink>) => write(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    write(next);
  };

  const input =
    'w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50';

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-muted text-center py-3">لا توجد روابط — اضغط «إضافة رابط»</p>}

      {rows.map((row, i) => {
        const ok = !!resolveLink(row).href;
        const type = TYPES.find((t) => t.id === row.type) || TYPES[0];
        return (
          <div key={row.id} className={`rounded-xl border p-3 space-y-2 ${ok || !row.url ? 'border-white/10' : 'border-red-500/50'}`}>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-lotus-500/20 text-lotus-300 text-xs flex items-center justify-center shrink-0">{i + 1}</span>
              <input
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="الاسم اللي هيظهر للفروع (مثلاً: فيديوهات شرح الصرف)"
                className={`${input} font-medium`}
              />
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30" title="لفوق">
                <ArrowUp className="w-4 h-4" />
              </button>
              <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30" title="لتحت">
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => confirm(`حذف «${row.label || 'الرابط'}»؟`) && write(rows.filter((_, j) => j !== i))}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 pr-8">
              <input dir="ltr" value={row.url} onChange={(e) => update(i, { url: e.target.value.trim() })} placeholder={type.placeholder} className={input} />
              <select
                value={row.type}
                onChange={(e) => update(i, { type: e.target.value as CompanyLink['type'] })}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-primary focus:outline-none"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {row.url && !ok && <p className="text-xs text-red-400 pr-8">الرابط ده مش مفهوم — اتأكد إنك نسخته كامل</p>}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => write([...rows, { id: `${company.id}-link-${Date.now().toString(36)}`, label: '', url: '', type: 'portal' }])}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500/20 text-lotus-300 text-sm font-medium hover:bg-lotus-500/30"
      >
        <Plus className="w-4 h-4" />
        إضافة رابط
      </button>
      <p className="text-[11px] text-muted">
        لينك جوجل درايف لازم يكون متشارك «أي حد معاه اللينك» (Anyone with the link) عشان الفروع تقدر تفتحه. ماتنساش «حفظ الكل».
      </p>
    </div>
  );
}

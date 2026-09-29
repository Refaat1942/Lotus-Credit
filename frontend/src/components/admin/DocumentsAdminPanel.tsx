import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, ChevronDown, ChevronUp, Loader2, Search, Square, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import type { Company, CompanyMedia, RulesData } from '../../types';
import CompanyLogo from '../CompanyLogo';
import { getMediaUsage } from '../../utils/mediaUsage';
import { stripMediaFromCompany } from '../../utils/companyMedia';
import {
  deleteCompanyMedia,
  readAsDataUrl,
  updateCompanyMedia,
  uploadManyCompanyMedia,
  validateImage,
} from '../../utils/mediaApi';

type CategoryFilter = 'all' | 'form' | 'card' | 'photo';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'الكل',
  form: 'نماذج',
  card: 'كارنيهات',
  photo: 'صور',
};

export type CompanyPatcher = (companyId: string, fn: (c: Company) => Company) => void;

interface DocumentsAdminPanelProps {
  data: RulesData;
  adminToken: string;
  onPatchCompany: CompanyPatcher;
}

export default function DocumentsAdminPanel({ data, adminToken, onPatchCompany }: DocumentsAdminPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const companies = useMemo(
    () => [...data.companies].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [data.companies],
  );
  const totalDocs = companies.reduce((sum, c) => sum + (c.media?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold">مكتبة المستندات</h2>
          <p className="text-xs text-muted mt-1">
            كل الصور والنماذج لكل شركة، ومكان استخدام كل واحدة — {totalDocs} مستند. يمكنك رفع أكثر من صورة مرة واحدة،
            وتحديد عدة صور وحذفها معاً.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو اسم الشركة..."
              className="w-full py-2 pr-9 pl-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
            />
          </div>
          <div className="flex gap-1">
            {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  category === c ? 'bg-lotus-500/25 text-lotus-300 border border-lotus-500/30' : 'glass hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {companies.map((company) => (
        <CompanyDocuments
          key={company.id}
          company={company}
          adminToken={adminToken}
          query={query}
          category={category}
          onPatch={(fn) => onPatchCompany(company.id, fn)}
        />
      ))}
    </div>
  );
}

export function CompanyDocuments({
  company,
  adminToken,
  onPatch,
  query = '',
  category = 'all',
  embedded = false,
}: {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
  query?: string;
  category?: CategoryFilter;
  /** Shown inside the company editor: always open, no header */
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(embedded);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<CompanyMedia | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const media = company.media || [];
  const filtered = media.filter((m) => {
    if (category !== 'all' && m.type !== category) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      company.nameAr.toLowerCase().includes(q) ||
      company.nameEn.toLowerCase().includes(q)
    );
  });

  const hasQuery = query.trim().length > 0;
  if (!embedded && hasQuery && filtered.length === 0) return null;

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setErrors([]);
    const { items, errors: errs } = await uploadManyCompanyMedia(company.id, adminToken, files, (done, total) =>
      setProgress({ done, total }),
    );
    if (items.length) onPatch((c) => ({ ...c, media: [...(c.media || []), ...items] }));
    setErrors(errs);
    setProgress(null);
    setOpen(true);
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const deleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`حذف ${ids.length} صورة نهائياً؟ سيتم إلغاء ربطها من أي نموذج أو خطوة تستخدمها.`)) return;
    setDeleting(true);
    setErrors([]);
    const removed: string[] = [];
    for (const id of ids) {
      try {
        await deleteCompanyMedia(company.id, adminToken, id);
        removed.push(id);
      } catch {
        setErrors((e) => [...e, `فشل حذف: ${media.find((m) => m.id === id)?.title || id}`]);
      }
    }
    onPatch((c) => removed.reduce((acc, id) => stripMediaFromCompany(acc, id), c));
    setSelected(new Set());
    setDeleting(false);
  };

  const body = (
    <div className={embedded ? 'space-y-3' : 'p-4 border-t border-white/10 space-y-3'}>
      {errors.length > 0 && (
        <div className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2 space-y-0.5">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-lotus-500/30 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          uploadFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((m) => m.id)))
            }
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15 disabled:opacity-40"
          >
            {allVisibleSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {allVisibleSelected ? 'إلغاء التحديد' : 'تحديد الكل'}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              حذف المحدد ({selected.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted hidden sm:inline">أو اسحب الصور هنا</span>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              uploadFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={!!progress}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lotus-500 text-white text-xs font-medium hover:bg-lotus-600 disabled:opacity-60"
          >
            {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {progress ? `جاري الرفع ${progress.done} / ${progress.total}` : 'رفع صور (يمكن اختيار أكثر من صورة)'}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted text-sm py-6">لا توجد صور بعد</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <DocumentCard
              key={item.id}
              company={company}
              item={item}
              adminToken={adminToken}
              selected={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
              onPatch={onPatch}
              onPreview={setPreview}
            />
          ))}
        </div>
      )}

      {preview &&
        createPortal(
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col" onClick={() => setPreview(null)}>
          <div className="flex justify-between items-center p-4 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-sm truncate">{preview.title}</p>
            <button type="button" onClick={() => setPreview(null)} className="p-2 rounded-lg bg-white/10">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={preview.url} alt={preview.title} className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>,
          document.body,
        )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/5 text-right"
      >
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo company={company} size="sm" />
          <div className="min-w-0">
            <p className="font-bold truncate">{company.nameAr}</p>
            <p className="text-xs text-muted">{hasQuery ? `${filtered.length} نتيجة` : `${media.length} مستند`}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      {open && body}
    </div>
  );
}

function DocumentCard({
  company,
  item,
  adminToken,
  selected,
  onToggle,
  onPatch,
  onPreview,
}: {
  company: Company;
  item: CompanyMedia;
  adminToken: string;
  selected: boolean;
  onToggle: () => void;
  onPatch: (fn: (c: Company) => Company) => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const usage = getMediaUsage(company, item.id);

  const replaceItem = (updated: CompanyMedia) =>
    onPatch((c) => ({ ...c, media: (c.media || []).map((m) => (m.id === updated.id ? { ...m, ...updated } : m)) }));

  const saveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      return;
    }
    setBusy(true);
    try {
      replaceItem(await updateCompanyMedia(company.id, adminToken, item.id, { title: trimmed }));
    } catch {
      setTitle(item.title);
      setError('فشل الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const replaceImage = async (file: File) => {
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      replaceItem(await updateCompanyMedia(company.id, adminToken, item.id, { dataUrl: await readAsDataUrl(file) }));
    } catch {
      setError('فشل الاستبدال');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`حذف "${item.title}"؟ سيتم إلغاء ربطها من أي نموذج أو خطوة تستخدمها.`)) return;
    setBusy(true);
    try {
      await deleteCompanyMedia(company.id, adminToken, item.id);
      onPatch((c) => stripMediaFromCompany(c, item.id));
    } catch {
      setError('فشل الحذف');
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-2.5 space-y-2 transition-colors ${
        selected ? 'border-red-400/60 bg-red-500/5' : 'border-theme bg-surface/30'
      }`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onPreview(item)}
          className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-black/20 relative group block"
        >
          <img src={item.url} alt={item.title} loading="lazy" className="w-full h-full object-contain" />
          <span className="absolute bottom-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-3.5 h-3.5 text-white" />
          </span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          title="تحديد"
          className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white"
        >
          {selected ? <CheckSquare className="w-4 h-4 text-red-300" /> : <Square className="w-4 h-4" />}
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        disabled={busy}
        className="w-full py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
      />

      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted">📍 مكانها في المرشد التفاعلي:</p>
        {usage.length > 0 ? (
          usage.map((u) => (
            <p key={u} className="text-[11px] leading-snug px-2 py-1 rounded-md bg-lotus-500/15 text-lotus-300">
              {u}
            </p>
          ))
        ) : (
          <p className="text-[11px] px-2 py-1 rounded-md bg-white/5 text-muted">مش ظاهرة في أي خطوة</p>
        )}
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) replaceImage(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'استبدال'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          title="حذف"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Search, Trash2, Upload, X, ZoomIn } from 'lucide-react';
import type { Company, CompanyMedia, RulesData } from '../../types';
import CompanyLogo from '../CompanyLogo';
import { getMediaUsage } from '../../utils/mediaUsage';

type CategoryFilter = 'all' | 'form' | 'card' | 'photo';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'الكل',
  form: 'نماذج',
  card: 'كارنيهات',
  photo: 'صور',
};

interface DocumentsAdminPanelProps {
  data: RulesData;
  adminToken: string;
  onCompanyChange: (company: Company) => void;
}

export default function DocumentsAdminPanel({ data, adminToken, onCompanyChange }: DocumentsAdminPanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [preview, setPreview] = useState<CompanyMedia | null>(null);

  const companies = useMemo(
    () => [...data.companies].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [data.companies],
  );

  const totalDocs = companies.reduce((sum, c) => sum + (c.media?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold">مكتبة المستندات</h2>
            <p className="text-xs text-muted mt-1">
              كل الصور والنماذج المرفوعة لكل شركة، ومكان استخدام كل واحدة — {totalDocs} مستند
            </p>
          </div>
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
          onChange={onCompanyChange}
          onPreview={setPreview}
        />
      ))}

      {preview && (
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
        </div>
      )}
    </div>
  );
}

function CompanyDocuments({
  company,
  adminToken,
  query,
  category,
  onChange,
  onPreview,
}: {
  company: Company;
  adminToken: string;
  query: string;
  category: CategoryFilter;
  onChange: (c: Company) => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
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
  if (hasQuery && filtered.length === 0) return null;

  const uploadNew = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('اختر صورة PNG أو JPG أو WebP');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('الحجم الأقصى 3MB');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch(`/api/admin/companies/${company.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ dataUrl, title: file.name.replace(/\.[^.]+$/, '') }),
      });
      if (!res.ok) throw new Error('upload failed');
      const { company: updated } = await res.json();
      onChange(updated);
      setOpen(true);
    } catch {
      setError('فشل رفع المستند');
    } finally {
      setUploading(false);
    }
  };

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

      {open && (
        <div className="p-4 border-t border-white/10 space-y-3">
          {error && <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

          <div className="flex justify-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadNew(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lotus-500 text-white text-xs font-medium hover:bg-lotus-600 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              رفع مستند جديد لهذه الشركة
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted text-sm py-6">لا توجد مستندات في هذا التصنيف</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((item) => (
                <DocumentCard
                  key={item.id}
                  company={company}
                  item={item}
                  adminToken={adminToken}
                  onChange={onChange}
                  onPreview={onPreview}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  company,
  item,
  adminToken,
  onChange,
  onPreview,
}: {
  company: Company;
  item: CompanyMedia;
  adminToken: string;
  onChange: (c: Company) => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const usage = getMediaUsage(company, item.id);

  const saveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title) {
      setTitle(item.title);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/media/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error('rename failed');
      const { company: updated } = await res.json();
      onChange(updated);
    } catch {
      setTitle(item.title);
    } finally {
      setSaving(false);
    }
  };

  const replaceImage = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) return;
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch(`/api/admin/companies/${company.id}/media/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error('replace failed');
      const { company: updated } = await res.json();
      onChange(updated);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`حذف "${item.title}"؟ سيتم إلغاء ربطها من أي نموذج أو خطوة تستخدمها.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/companies/${company.id}/media/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error('delete failed');
      const { company: updated } = await res.json();
      onChange(updated);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-theme bg-surface/30 p-3 space-y-2">
      <button
        type="button"
        onClick={() => onPreview(item)}
        className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-black/20 relative group"
      >
        <img src={item.url} alt={item.title} className="w-full h-full object-contain" />
        <span className="absolute top-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
        </span>
      </button>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        disabled={saving || busy}
        className="w-full py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
      />

      <div className="flex flex-wrap gap-1">
        {usage.length > 0 ? (
          usage.map((u) => (
            <span key={u} className="text-[10px] px-2 py-0.5 rounded-full bg-lotus-500/15 text-lotus-300">
              {u}
            </span>
          ))
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted">غير مستخدمة حالياً</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
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
          {busy ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'استبدال الصورة'}
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

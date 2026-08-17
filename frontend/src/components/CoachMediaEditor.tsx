import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X, ZoomIn } from 'lucide-react';
import type { Company, CompanyMedia } from '../types';
import { COACH_STEP_CONFIG, removeStepMediaId, setStepMediaId } from '../utils/coachSteps';

interface CoachMediaEditorProps {
  company: Company;
  adminToken: string;
  onChange: (company: Company) => void;
}

export default function CoachMediaEditor({ company, adminToken, onChange }: CoachMediaEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CompanyMedia | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const media = company.media || [];
  const formMediaMap = company.formMediaMap || {};
  const stepMediaMap = company.stepMediaMap || {};
  const forms = company.forms || [];

  const patch = (partial: Partial<Company>) => onChange({ ...company, ...partial });

  const uploadImage = async (file: File, title?: string) => {
    if (!file.type.startsWith('image/')) throw new Error('type');
    if (file.size > 3 * 1024 * 1024) throw new Error('size');
    const dataUrl = await readAsDataUrl(file);
    const res = await fetch(`/api/admin/companies/${company.id}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ dataUrl, title: title || file.name }),
    });
    if (!res.ok) throw new Error('upload');
    const { media: item } = await res.json();
    return item as CompanyMedia;
  };

  const handleUpload = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const item = await uploadImage(file);
      patch({ media: [...media, item] });
    } catch {
      setError('فشل رفع الصورة (PNG/JPG/WebP — حد أقصى 3MB)');
    } finally {
      setUploading(false);
    }
  };

  const setFormMap = (formLabel: string, mediaId: string | null) => {
    const next = { ...formMediaMap };
    if (!mediaId) delete next[formLabel];
    else next[formLabel] = mediaId;
    patch({ formMediaMap: next });
  };

  const setStepMap = (phase: typeof COACH_STEP_CONFIG[number]['id'], mediaId: string | null, multi?: boolean) => {
    if (!mediaId) {
      const cur = stepMediaMap[phase];
      if (Array.isArray(cur) && cur.length) return;
      const next = { ...stepMediaMap };
      delete next[phase];
      patch({ stepMediaMap: next });
      return;
    }
    patch({ stepMediaMap: setStepMediaId(stepMediaMap, phase, mediaId, multi) });
  };

  const clearStepMedia = (phase: typeof COACH_STEP_CONFIG[number]['id'], mediaId?: string) => {
    if (mediaId) {
      patch({ stepMediaMap: removeStepMediaId(stepMediaMap, phase, mediaId) });
    } else {
      const next = { ...stepMediaMap };
      delete next[phase];
      patch({ stepMediaMap: next });
    }
  };

  const removeMediaItem = (id: string) => {
    if (!confirm('حذف هذه الصورة من القائمة؟ (لن يحذف الملف من السيرفر)')) return;
    const nextMedia = media.filter((m) => m.id !== id);
    const nextFormMap = Object.fromEntries(
      Object.entries(formMediaMap).filter(([, mid]) => mid !== id),
    );
    const nextStepMap: typeof stepMediaMap = {};
    for (const [phase, val] of Object.entries(stepMediaMap)) {
      if (Array.isArray(val)) {
        const f = val.filter((mid) => mid !== id);
        if (f.length) nextStepMap[phase as keyof typeof stepMediaMap] = f;
      } else if (val !== id) {
        nextStepMap[phase as keyof typeof stepMediaMap] = val;
      }
    }
    patch({ media: nextMedia, formMediaMap: nextFormMap, stepMediaMap: nextStepMap });
  };

  return (
    <div className="space-y-6 pt-4 border-t border-white/10">
      <div>
        <h3 className="font-bold text-lg">صور المرشد التفاعلي</h3>
        <p className="text-xs text-muted mt-1">
          اختر الصورة التي تظهر في كل خطوة للصيدلي — بدون اعتماد على التخمين التلقائي.
          احفظ الكل بعد الانتهاء.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-theme bg-surface/40 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lotus-500/20 text-lotus-600 dark:text-lotus-300 text-sm font-medium hover:bg-lotus-500/30 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          رفع صورة جديدة للشركة
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <p className="text-[11px] text-muted mt-2">{media.length} صورة متاحة</p>
      </div>

      {/* Form → image (most important) */}
      <section className="space-y-3">
        <h4 className="font-semibold text-primary">ربط أنواع النماذج بالصور</h4>
        <p className="text-xs text-muted">كل سطر في «طرق الصرف» → الصورة التي يراها الصيدلي</p>
        {forms.length === 0 ? (
          <p className="text-sm text-muted">أضف طرق الصرف أولاً في الحقل أعلاه.</p>
        ) : (
          forms.map((form) => (
            <MediaPickerRow
              key={form}
              label={form}
              value={formMediaMap[form] || ''}
              media={media}
              onChange={(id) => setFormMap(form, id || null)}
              onPreview={setPreview}
            />
          ))
        )}
      </section>

      {/* Coach steps */}
      <section className="space-y-3">
        <h4 className="font-semibold text-primary">صور خطوات المرشد</h4>
        {COACH_STEP_CONFIG.map((step) => {
          const assigned = stepMediaMap[step.id];
          const assignedIds = assigned ? (Array.isArray(assigned) ? assigned : [assigned]) : [];
          return (
            <div key={step.id} className="rounded-xl border border-theme bg-surface/30 p-3 space-y-2">
              <div>
                <p className="text-sm font-medium text-primary">{step.labelAr}</p>
                <p className="text-[11px] text-muted">{step.hint}</p>
              </div>
              {assignedIds.map((id) => {
                const item = media.find((m) => m.id === id);
                if (!item) return null;
                return (
                  <AssignedChip
                    key={id}
                    item={item}
                    onPreview={() => setPreview(item)}
                    onRemove={() => clearStepMedia(step.id, id)}
                  />
                );
              })}
              <MediaPickerRow
                label={step.multi ? 'إضافة صورة لهذه الخطوة' : 'اختر الصورة'}
                value=""
                media={media}
                onChange={(id) => id && setStepMap(step.id, id, step.multi)}
                onPreview={setPreview}
                placeholder="— اختر صورة —"
              />
              {assignedIds.length > 0 && !step.multi && (
                <button
                  type="button"
                  onClick={() => clearStepMedia(step.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  إزالة التعيين (استخدم التلقائي)
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* All media gallery */}
      <section className="space-y-2">
        <h4 className="font-semibold text-primary">كل الصور ({media.length})</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          {media.map((m) => (
            <div key={m.id} className="relative group rounded-lg border border-theme overflow-hidden bg-black/20">
              <button type="button" onClick={() => setPreview(m)} className="block w-full aspect-[4/3]">
                <img src={m.url} alt={m.title} className="w-full h-full object-contain" />
              </button>
              <p className="text-[10px] text-muted px-1 py-0.5 truncate" title={m.title}>
                {m.title}
              </p>
              <p className="text-[9px] text-muted/70 px-1 pb-1">p{m.page} · {m.type}</p>
              <button
                type="button"
                onClick={() => removeMediaItem(m.id)}
                className="absolute top-1 left-1 p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="إزالة من القائمة"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {preview && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex flex-col"
          onClick={() => setPreview(null)}
        >
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

function MediaPickerRow({
  label,
  value,
  media,
  onChange,
  onPreview,
  placeholder = '— تلقائي —',
}: {
  label: string;
  value: string;
  media: CompanyMedia[];
  onChange: (mediaId: string) => void;
  onPreview: (m: CompanyMedia) => void;
  placeholder?: string;
}) {
  const selected = media.find((m) => m.id === value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted min-w-[120px] flex-1 truncate" title={label}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-[160px] py-2 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
      >
        <option value="">{placeholder}</option>
        {media.map((m) => (
          <option key={m.id} value={m.id}>
            ص{m.page} · {m.title.slice(0, 40)}
          </option>
        ))}
      </select>
      {selected && (
        <button
          type="button"
          onClick={() => onPreview(selected)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
          title="معاينة"
        >
          <ZoomIn className="w-4 h-4 text-lotus-400" />
        </button>
      )}
    </div>
  );
}

function AssignedChip({
  item,
  onPreview,
  onRemove,
}: {
  item: CompanyMedia;
  onPreview: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-lotus-500/10 border border-lotus-500/20 p-2">
      <button type="button" onClick={onPreview} className="w-12 h-12 rounded overflow-hidden shrink-0 bg-black/20">
        <img src={item.url} alt="" className="w-full h-full object-contain" />
      </button>
      <span className="text-xs text-primary flex-1 truncate">{item.title}</span>
      <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:bg-red-500/10 rounded">
        <X className="w-4 h-4" />
      </button>
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

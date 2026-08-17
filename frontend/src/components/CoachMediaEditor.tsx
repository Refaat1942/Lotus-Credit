import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X, ZoomIn, Upload } from 'lucide-react';
import type { Company, CompanyMedia } from '../types';
import {
  COACH_ANSWER_MEDIA_CONFIG,
  COACH_STEP_CONFIG,
  removeStepMediaId,
  setStepMediaId,
} from '../utils/coachSteps';

interface CoachMediaEditorProps {
  company: Company;
  adminToken: string;
  onChange: (company: Company) => void;
}

export default function CoachMediaEditor({ company, adminToken, onChange }: CoachMediaEditorProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CompanyMedia | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ kind: 'form'; index: number } | { kind: 'answer'; key: string } | { kind: 'general' } | null>(null);

  const media = company.media || [];
  const formMediaMap = company.formMediaMap || {};
  const formMediaByIndex = company.formMediaByIndex || [];
  const coachAnswerMedia = company.coachAnswerMedia || {};
  const stepMediaMap = company.stepMediaMap || {};
  const forms = company.forms || [];
  const formsEn = company.formsEn || [];

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
    const ctx = pendingUpload.current;
    pendingUpload.current = null;
    const uploadKey = ctx?.kind === 'form'
      ? `form-${ctx.index}`
      : ctx?.kind === 'answer'
        ? ctx.key
        : 'general';
    setUploading(uploadKey);

    try {
      const title = ctx?.kind === 'form'
        ? forms[ctx.index] || `Form ${ctx.index + 1}`
        : ctx?.kind === 'answer'
          ? COACH_ANSWER_MEDIA_CONFIG.find((a) => a.key === ctx.key)?.labelAr || ctx.key
          : file.name;
      const item = await uploadImage(file, title);
      const nextMedia = [...media, item];

      if (ctx?.kind === 'form') {
        setFormMediaAtIndex(ctx.index, item.id, nextMedia);
      } else if (ctx?.kind === 'answer') {
        patch({
          media: nextMedia,
          coachAnswerMedia: { ...coachAnswerMedia, [ctx.key]: item.id },
        });
      } else {
        patch({ media: nextMedia });
      }
    } catch {
      setError('فشل رفع الصورة (PNG/JPG/WebP — حد أقصى 3MB)');
    } finally {
      setUploading(null);
    }
  };

  const setFormMediaAtIndex = (index: number, mediaId: string | null, nextMedia = media) => {
    const nextByIndex = [...formMediaByIndex];
    while (nextByIndex.length < forms.length) nextByIndex.push('');
    if (mediaId) nextByIndex[index] = mediaId;
    else nextByIndex[index] = '';

    const nextMap = { ...formMediaMap };
    const label = forms[index];
    if (label) {
      if (mediaId) nextMap[label] = mediaId;
      else delete nextMap[label];
    }

    const trimmedIndex = nextByIndex.slice(0, forms.length);
    const hasIndex = trimmedIndex.some(Boolean);

    patch({
      media: nextMedia,
      formMediaByIndex: hasIndex ? trimmedIndex : undefined,
      formMediaMap: Object.keys(nextMap).length ? nextMap : undefined,
      coachAnswerMedia: mediaId
        ? { ...coachAnswerMedia, [`form:${index}`]: mediaId }
        : (() => {
            const next = { ...coachAnswerMedia };
            delete next[`form:${index}`];
            return Object.keys(next).length ? next : undefined;
          })(),
    });
  };

  const setAnswerMedia = (key: string, mediaId: string | null) => {
    const next = { ...coachAnswerMedia };
    if (!mediaId) delete next[key];
    else next[key] = mediaId;
    patch({ coachAnswerMedia: Object.keys(next).length ? next : undefined });
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
    const nextByIndex = formMediaByIndex.map((mid) => (mid === id ? '' : mid));
    const hasIndex = nextByIndex.some(Boolean);
    const nextAnswer = Object.fromEntries(
      Object.entries(coachAnswerMedia).filter(([, mid]) => mid !== id),
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
    patch({
      media: nextMedia,
      formMediaMap: Object.keys(nextFormMap).length ? nextFormMap : undefined,
      formMediaByIndex: hasIndex ? nextByIndex : undefined,
      coachAnswerMedia: Object.keys(nextAnswer).length ? nextAnswer : undefined,
      stepMediaMap: nextStepMap,
    });
  };

  const triggerUpload = (ctx: NonNullable<typeof pendingUpload.current>) => {
    pendingUpload.current = ctx;
    fileRef.current?.click();
  };

  const getFormMediaId = (index: number) =>
    coachAnswerMedia[`form:${index}`] || formMediaByIndex[index] || formMediaMap[forms[index]] || '';

  return (
    <div className="space-y-6 pt-4 border-t border-white/10">
      <div>
        <h3 className="font-bold text-lg">صور إجابات المرشد</h3>
        <p className="text-xs text-muted mt-1">
          اربط صورة بكل اختيار يضغطه الصيدلي — مثلاً «نموذج أزرق» → صورة النموذج الأزرق.
          ارفع مباشرة أو اختر من الصور المستخرجة. احفظ الكل بعد الانتهاء.
        </p>
      </div>

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

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Form choices — primary section */}
      <section className="space-y-3 rounded-xl border border-lotus-500/25 bg-lotus-500/5 p-4">
        <h4 className="font-semibold text-primary">③ اختيار نوع النموذج / الروشتة</h4>
        <p className="text-xs text-muted">
          كل سطر في «طرق الصرف» = زر يختاره الصيدلي. ارفع صورة النموذج (أصفر، أزرق، E-Form…).
        </p>
        {forms.length === 0 ? (
          <p className="text-sm text-muted">أضف طرق الصرف أولاً في الحقل أعلاه.</p>
        ) : (
          forms.map((form, index) => (
            <FormAnswerRow
              key={`${index}-${form}`}
              index={index}
              labelAr={form}
              labelEn={formsEn[index]}
              mediaId={getFormMediaId(index)}
              media={media}
              uploading={uploading === `form-${index}`}
              onUpload={() => triggerUpload({ kind: 'form', index })}
              onSelect={(id) => setFormMediaAtIndex(index, id || null)}
              onClear={() => setFormMediaAtIndex(index, null)}
              onPreview={setPreview}
            />
          ))
        )}
      </section>

      {/* Card & approval answer images */}
      <section className="space-y-3">
        <h4 className="font-semibold text-primary">①②④ صور إجابات أخرى (كارنية / موافقة)</h4>
        <p className="text-xs text-muted">اختياري — صورة تظهر عند ضغط الصيدلي على هذا الزر</p>
        {COACH_ANSWER_MEDIA_CONFIG.map((answer) => (
          <FormAnswerRow
            key={answer.key}
            index={0}
            labelAr={answer.labelAr}
            labelEn={answer.labelEn}
            mediaId={coachAnswerMedia[answer.key] || ''}
            media={media}
            uploading={uploading === answer.key}
            onUpload={() => triggerUpload({ kind: 'answer', key: answer.key })}
            onSelect={(id) => setAnswerMedia(answer.key, id || null)}
            onClear={() => setAnswerMedia(answer.key, null)}
            onPreview={setPreview}
            compact
          />
        ))}
      </section>

      {/* Coach steps fallback */}
      <section className="space-y-3">
        <h4 className="font-semibold text-primary">صور خطوات عامة (احتياطي)</h4>
        <p className="text-xs text-muted">تُستخدم إذا لم تُعيَّن صورة لإجابة محددة أعلاه</p>
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
                label={step.multi ? 'إضافة صورة' : 'اختر صورة'}
                value=""
                media={media}
                onChange={(id) => id && setStepMap(step.id, id, step.multi)}
                onPreview={setPreview}
                placeholder="— اختر —"
              />
              {assignedIds.length > 0 && !step.multi && (
                <button
                  type="button"
                  onClick={() => clearStepMedia(step.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  إزالة التعيين
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* General upload + gallery */}
      <div className="rounded-xl border border-theme bg-surface/40 p-4 space-y-2">
        <button
          type="button"
          disabled={!!uploading}
          onClick={() => triggerUpload({ kind: 'general' })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lotus-500/20 text-lotus-600 dark:text-lotus-300 text-sm font-medium hover:bg-lotus-500/30 disabled:opacity-50"
        >
          {uploading === 'general' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          رفع صورة عامة (بدون ربط)
        </button>
        <p className="text-[11px] text-muted">{media.length} صورة متاحة</p>
      </div>

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
              <button
                type="button"
                onClick={() => removeMediaItem(m.id)}
                className="absolute top-1 left-1 p-1 rounded bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="إزالة"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

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

function FormAnswerRow({
  index,
  labelAr,
  labelEn,
  mediaId,
  media,
  uploading,
  onUpload,
  onSelect,
  onClear,
  onPreview,
  compact,
}: {
  index: number;
  labelAr: string;
  labelEn?: string;
  mediaId: string;
  media: CompanyMedia[];
  uploading: boolean;
  onUpload: () => void;
  onSelect: (id: string) => void;
  onClear: () => void;
  onPreview: (m: CompanyMedia) => void;
  compact?: boolean;
}) {
  const selected = media.find((m) => m.id === mediaId);
  return (
    <div className={`rounded-xl border border-theme bg-surface/40 ${compact ? 'p-2' : 'p-3'} space-y-2`}>
      <div className="flex flex-wrap items-start gap-3">
        {!compact && (
          <span className="w-7 h-7 rounded-full bg-lotus-500/20 text-lotus-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
        )}
        <div className="flex-1 min-w-[140px]">
          <p className="text-sm font-medium text-primary">{labelAr}</p>
          {labelEn && <p className="text-xs text-muted">{labelEn}</p>}
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => onPreview(selected)}
            className="w-16 h-16 rounded-lg border border-lotus-500/30 overflow-hidden bg-black/20 shrink-0 hover:ring-2 ring-lotus-500/50"
          >
            <img src={selected.url} alt="" className="w-full h-full object-contain" />
          </button>
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-theme flex items-center justify-center text-[10px] text-muted shrink-0">
            لا صورة
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lotus-500/20 text-lotus-600 dark:text-lotus-300 text-xs font-medium hover:bg-lotus-500/30 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          رفع صورة
        </button>
        <select
          value={mediaId}
          onChange={(e) => onSelect(e.target.value)}
          className="flex-1 min-w-[140px] py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
        >
          <option value="">— اختر من المعرض —</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title.slice(0, 50)}
            </option>
          ))}
        </select>
        {selected && (
          <>
            <button
              type="button"
              onClick={() => onPreview(selected)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              title="معاينة"
            >
              <ZoomIn className="w-4 h-4 text-lotus-400" />
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-400 hover:underline px-2"
            >
              إزالة
            </button>
          </>
        )}
      </div>
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
      <span className="text-xs text-muted min-w-[100px] flex-1 truncate">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-[140px] py-2 px-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
      >
        <option value="">{placeholder}</option>
        {media.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title.slice(0, 40)}
          </option>
        ))}
      </select>
      {selected && (
        <button type="button" onClick={() => onPreview(selected)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
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

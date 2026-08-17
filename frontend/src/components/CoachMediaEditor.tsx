import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X, ZoomIn, Images } from 'lucide-react';
import type { Company, CompanyMedia } from '../types';
import { mediaPickerLabel, pickableCoachMedia } from '../utils/mediaFilters';
import { setStepMediaId } from '../utils/coachSteps';

interface CoachMediaEditorProps {
  company: Company;
  adminToken: string;
  onChange: (company: Company) => void;
}

type UploadTarget = number | 'card' | 'approval';

export default function CoachMediaEditor({ company, adminToken, onChange }: CoachMediaEditorProps) {
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<CompanyMedia | null>(null);
  const [pickerFor, setPickerFor] = useState<UploadTarget | null>(null);

  const media = company.media || [];
  const pickable = useMemo(() => pickableCoachMedia(media), [media]);
  const uploaded = useMemo(
    () => media.filter((m) => m.page === 0 || m.id.includes('-coach-')),
    [media],
  );

  const formMediaMap = company.formMediaMap || {};
  const formMediaByIndex = company.formMediaByIndex || [];
  const stepMediaMap = company.stepMediaMap || {};
  const forms = company.forms || [];

  const patch = (partial: Partial<Company>) => onChange({ ...company, ...partial });

  const uploadImage = async (file: File, title: string) => {
    if (!file.type.startsWith('image/')) throw new Error('type');
    if (file.size > 3 * 1024 * 1024) throw new Error('size');
    const dataUrl = await readAsDataUrl(file);
    const res = await fetch(`/api/admin/companies/${company.id}/media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ dataUrl, title }),
    });
    if (!res.ok) throw new Error('upload');
    const { media: item } = await res.json();
    return item as CompanyMedia;
  };

  const assignFormImage = (index: number, mediaId: string | null, nextMedia = media) => {
    const nextByIndex = [...formMediaByIndex];
    while (nextByIndex.length < forms.length) nextByIndex.push('');
    nextByIndex[index] = mediaId || '';

    const nextMap = { ...formMediaMap };
    const label = forms[index];
    if (label) {
      if (mediaId) nextMap[label] = mediaId;
      else delete nextMap[label];
    }

    const trimmed = nextByIndex.slice(0, forms.length);
    patch({
      media: nextMedia,
      formMediaByIndex: trimmed.some(Boolean) ? trimmed : undefined,
      formMediaMap: Object.keys(nextMap).length ? nextMap : undefined,
    });
  };

  const applyMedia = (target: UploadTarget, mediaId: string, nextMedia = media) => {
    if (typeof target === 'number') {
      assignFormImage(target, mediaId, nextMedia);
      return;
    }
    if (target === 'card') {
      const withCheck = setStepMediaId(stepMediaMap, 'card_check', mediaId);
      patch({
        media: nextMedia,
        stepMediaMap: setStepMediaId(withCheck, 'card_help', mediaId),
      });
      return;
    }
    patch({
      media: nextMedia,
      stepMediaMap: setStepMediaId(stepMediaMap, 'approval_portal', mediaId, true),
    });
  };

  const runUpload = async (file: File, target: UploadTarget) => {
    setError('');
    setUploading(target);
    try {
      let title = file.name.replace(/\.[^.]+$/, '');
      if (typeof target === 'number') title = forms[target] || `نموذج ${target + 1}`;
      else if (target === 'card') title = 'كارنية';
      else if (target === 'approval') title = 'موافقة';

      const item = await uploadImage(file, title);
      applyMedia(target, item.id, [...media, item]);
    } catch {
      setError('فشل رفع الصورة — اختر PNG أو JPG أو WebP (حد أقصى 3MB)');
    } finally {
      setUploading(null);
    }
  };

  const getFormMediaId = (index: number) =>
    formMediaByIndex[index] || formMediaMap[forms[index]] || '';

  const cardMediaId = typeof stepMediaMap.card_check === 'string' ? stepMediaMap.card_check : '';
  const approvalIds = stepMediaMap.approval_portal;
  const approvalMediaId = Array.isArray(approvalIds) ? approvalIds[0] || '' : approvalIds || '';

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

      <p className="text-xs text-muted leading-relaxed">
        كل سطر في «طرق الصرف» = زر للصيدلي. ارفع صورة من <strong className="text-primary">الجهاز</strong> أو
        اختر نموذجاً من <strong className="text-primary">صور المستند</strong> (معاينة مصغّرة — بدون قوائم نص طويل).
      </p>

      {forms.length === 0 ? (
        <p className="text-sm text-muted py-2">أضف طرق الصرف في الحقل أعلاه أولاً.</p>
      ) : (
        <div className="space-y-3">
          {forms.map((form, index) => (
            <DocumentRow
              key={`${index}-${form}`}
              index={index}
              label={form}
              mediaId={getFormMediaId(index)}
              media={media}
              uploading={uploading === index}
              onUploadFromDevice={(file) => runUpload(file, index)}
              onOpenPicker={() => setPickerFor(index)}
              onClear={() => assignFormImage(index, null)}
              onPreview={setPreview}
            />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <ExtraImageRow
          label="صورة الكارنية (اختياري)"
          mediaId={cardMediaId}
          media={media}
          uploading={uploading === 'card'}
          onUploadFromDevice={(file) => runUpload(file, 'card')}
          onOpenPicker={() => setPickerFor('card')}
          onPreview={setPreview}
        />
        <ExtraImageRow
          label="صورة الموافقة (اختياري)"
          mediaId={approvalMediaId}
          media={media}
          uploading={uploading === 'approval'}
          onUploadFromDevice={(file) => runUpload(file, 'approval')}
          onOpenPicker={() => setPickerFor('approval')}
          onPreview={setPreview}
        />
      </div>

      {pickerFor !== null && (
        <ImagePickerModal
          title={
            typeof pickerFor === 'number'
              ? `اختر صورة: ${forms[pickerFor] || `نموذج ${pickerFor + 1}`}`
              : pickerFor === 'card'
                ? 'اختر صورة الكارنية'
                : 'اختر صورة الموافقة'
          }
          documentImages={pickable}
          uploadedImages={uploaded}
          selectedId={
            typeof pickerFor === 'number'
              ? getFormMediaId(pickerFor)
              : pickerFor === 'card'
                ? cardMediaId
                : approvalMediaId
          }
          onSelect={(id) => {
            applyMedia(pickerFor, id);
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
          onPreview={setPreview}
        />
      )}

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

function DocumentRow({
  index,
  label,
  mediaId,
  media,
  uploading,
  onUploadFromDevice,
  onOpenPicker,
  onClear,
  onPreview,
}: {
  index: number;
  label: string;
  mediaId: string;
  media: CompanyMedia[];
  uploading: boolean;
  onUploadFromDevice: (file: File) => void;
  onOpenPicker: () => void;
  onClear: () => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = media.find((m) => m.id === mediaId);

  return (
    <div className="rounded-xl border border-lotus-500/20 bg-lotus-500/5 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-lotus-500/25 text-lotus-300 text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium text-primary min-w-[120px]">{label}</p>
        {selected ? (
          <button
            type="button"
            onClick={() => onPreview(selected)}
            className="w-24 h-16 rounded-lg border border-lotus-500/30 overflow-hidden bg-black/20 shrink-0"
          >
            <img src={selected.url} alt="" className="w-full h-full object-contain" />
          </button>
        ) : (
          <div className="w-24 h-16 rounded-lg border border-dashed border-theme flex items-center justify-center text-[10px] text-muted shrink-0 px-1 text-center">
            لم تُرفع صورة
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3 mr-10">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadFromDevice(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          رفع من الجهاز
        </button>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/15 border border-white/10"
        >
          <Images className="w-4 h-4" />
          من المستند
        </button>
        {selected && (
          <>
            <button type="button" onClick={() => onPreview(selected)} className="p-2 rounded-lg bg-white/5" title="تكبير">
              <ZoomIn className="w-4 h-4 text-lotus-400" />
            </button>
            <button type="button" onClick={onClear} className="text-xs text-red-400 px-2 hover:underline">
              إزالة
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ExtraImageRow({
  label,
  mediaId,
  media,
  uploading,
  onUploadFromDevice,
  onOpenPicker,
  onPreview,
}: {
  label: string;
  mediaId: string;
  media: CompanyMedia[];
  uploading: boolean;
  onUploadFromDevice: (file: File) => void;
  onOpenPicker: () => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = media.find((m) => m.id === mediaId);

  return (
    <div className="rounded-xl border border-theme bg-surface/30 p-3 space-y-2">
      <p className="text-xs font-medium text-primary">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {selected && (
          <button type="button" onClick={() => onPreview(selected)} className="w-16 h-11 rounded overflow-hidden bg-black/20 shrink-0">
            <img src={selected.url} alt="" className="w-full h-full object-contain" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadFromDevice(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lotus-500/20 text-sm hover:bg-lotus-500/30 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          من الجهاز
        </button>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          من المستند
        </button>
      </div>
    </div>
  );
}

function ImagePickerModal({
  title,
  documentImages,
  uploadedImages,
  selectedId,
  onSelect,
  onClose,
  onPreview,
}: {
  title: string;
  documentImages: CompanyMedia[];
  uploadedImages: CompanyMedia[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const [tab, setTab] = useState<'doc' | 'uploaded'>(uploadedImages.length ? 'uploaded' : 'doc');
  const list = tab === 'uploaded' ? uploadedImages : documentImages;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-[#1a2332] border border-white/10 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold text-primary text-sm sm:text-base">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 p-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('uploaded')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${
              tab === 'uploaded' ? 'bg-lotus-500/25 text-lotus-300' : 'text-muted hover:bg-white/5'
            }`}
          >
            مرفوعة من الجهاز ({uploadedImages.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('doc')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${
              tab === 'doc' ? 'bg-lotus-500/25 text-lotus-300' : 'text-muted hover:bg-white/5'
            }`}
          >
            من المستند ({documentImages.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {list.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">
              {tab === 'uploaded'
                ? 'لا توجد صور مرفوعة — استخدم «رفع من الجهاز»'
                : 'لا توجد صور مناسبة في المستند — ارفع من الجهاز'}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {list.map((m, i) => {
                const active = m.id === selectedId;
                const label = mediaPickerLabel(m, i);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m.id)}
                    className={`rounded-xl border overflow-hidden text-right transition-all ${
                      active
                        ? 'border-lotus-500 ring-2 ring-lotus-500/40'
                        : 'border-white/10 hover:border-lotus-500/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-black/30 relative group">
                      <img src={m.url} alt={label} className="w-full h-full object-contain" />
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(m);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            onPreview(m);
                          }
                        }}
                        className="absolute top-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </span>
                    </div>
                    <p className="text-[10px] text-primary px-2 py-1.5 leading-snug line-clamp-2" title={m.title}>
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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

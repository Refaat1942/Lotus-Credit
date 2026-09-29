import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Images, Loader2, Upload, X, ZoomIn } from 'lucide-react';
import type { Company, CompanyMedia } from '../types';
import { galleryMedia } from '../utils/mediaFilters';
import { resolveFormDocs } from '../utils/coachSteps';
import { uploadManyCompanyMedia } from '../utils/mediaApi';
import PhotoPicker from './admin/PhotoPicker';

interface CoachMediaEditorProps {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
}

/** Documents shown to the pharmacist for each prescription type — several per type. */
export default function CoachMediaEditor({ company, adminToken, onPatch }: CoachMediaEditorProps) {
  const [preview, setPreview] = useState<CompanyMedia | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const forms = company.forms || [];
  const media = galleryMedia(company.media || []);

  const docsFor = (c: Company, index: number) =>
    resolveFormDocs(c.forms?.[index] || '', galleryMedia(c.media || []), c, index).map((m) => m.id);

  // Writes an explicit list for this type and clears the older single-image fields for it.
  const writeForm = (index: number, fn: (ids: string[]) => string[], extra?: (c: Company) => Company) =>
    onPatch((c0) => {
      const c = extra ? extra(c0) : c0;
      const label = c.forms?.[index];
      if (!label) return c;
      const ids = fn(docsFor(c, index));
      const byIndex = [...(c.formMediaByIndex || [])];
      if (index < byIndex.length) byIndex[index] = '';
      const byMap = { ...(c.formMediaMap || {}) };
      delete byMap[label];
      const answers = { ...(c.coachAnswerMedia || {}) };
      delete answers[`form:${index}`];
      return {
        ...c,
        formMedia: { ...(c.formMedia || {}), [label]: ids },
        formMediaByIndex: byIndex.some(Boolean) ? byIndex : undefined,
        formMediaMap: Object.keys(byMap).length ? byMap : undefined,
        coachAnswerMedia: Object.keys(answers).length ? answers : undefined,
      };
    });

  const addUploaded = (index: number, items: CompanyMedia[]) =>
    writeForm(
      index,
      (ids) => [...ids, ...items.map((m) => m.id)],
      (c) => ({ ...c, media: [...(c.media || []), ...items] }),
    );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted leading-relaxed">
        المستندات اللي تظهر للصيدلي لما يختار كل نوع — تقدر ترفع أكتر من مستند، تعاينه، وتشيل أي واحد.
      </p>

      {forms.length === 0 ? (
        <p className="text-sm text-muted py-2">أضف أنواع الروشتات في الحقل أعلاه أولاً.</p>
      ) : (
        forms.map((form, index) => (
          <FormRow
            key={`${index}-${form}`}
            index={index}
            label={form}
            docs={resolveFormDocs(form, media, company, index)}
            companyId={company.id}
            adminToken={adminToken}
            onRemove={(id) => writeForm(index, (ids) => ids.filter((x) => x !== id))}
            onUploaded={(items) => addUploaded(index, items)}
            onOpenPicker={() => setPickerFor(index)}
            onPreview={setPreview}
          />
        ))
      )}

      {pickerFor !== null && (
        <PhotoPicker
          company={company}
          adminToken={adminToken}
          selected={resolveFormDocs(forms[pickerFor] || '', media, company, pickerFor).map((m) => m.id)}
          onToggle={(id) => writeForm(pickerFor, (ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
          onUploaded={(items) => addUploaded(pickerFor, items)}
          onClose={() => setPickerFor(null)}
        />
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
            <div className="flex-1 flex items-center justify-center p-4 min-h-0" onClick={(e) => e.stopPropagation()}>
              <img src={preview.url} alt={preview.title} className="max-w-full max-h-[85vh] object-contain" />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function FormRow({
  index,
  label,
  docs,
  companyId,
  adminToken,
  onRemove,
  onUploaded,
  onOpenPicker,
  onPreview,
}: {
  index: number;
  label: string;
  docs: CompanyMedia[];
  companyId: string;
  adminToken: string;
  onRemove: (id: string) => void;
  onUploaded: (items: CompanyMedia[]) => void;
  onOpenPicker: () => void;
  onPreview: (m: CompanyMedia) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setErrors([]);
    const { items, errors: errs } = await uploadManyCompanyMedia(companyId, adminToken, files, (d, t) =>
      setProgress(`${d} / ${t}`),
    );
    if (items.length) onUploaded(items);
    setErrors(errs);
    setProgress(null);
  };

  return (
    <div
      className="rounded-xl border border-lotus-500/20 bg-lotus-500/5 p-3 space-y-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        upload(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-lotus-500/25 text-lotus-300 text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium text-primary">{label}</p>
        <span className="text-[11px] text-muted shrink-0">{docs.length} مستند</span>
      </div>

      {docs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {docs.map((m, n) => (
            <div key={m.id} className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
              <div className="relative group">
                <button type="button" onClick={() => onPreview(m)} className="block w-full aspect-[4/3]" title="معاينة">
                  <img src={m.url} alt={m.title} loading="lazy" className="w-full h-full object-contain" />
                  <span className="absolute bottom-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                  </span>
                </button>
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center">
                  {n + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(m.id)}
                  title="حذف من هذا النوع"
                  className="absolute top-1 left-1 p-1 rounded-md bg-red-500/80 hover:bg-red-500 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] px-2 py-1 truncate text-muted" title={m.title}>
                {m.title}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-theme py-4 text-center text-xs text-muted">
          لا توجد مستندات — ارفع من الجهاز أو اسحب الصور هنا
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-xs text-red-400">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            upload(Array.from(e.target.files || []));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={!!progress}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-60"
        >
          {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {progress ? `جاري الرفع ${progress}` : 'رفع من الجهاز (أكتر من صورة)'}
        </button>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/15 border border-white/10"
        >
          <Images className="w-4 h-4" />
          اختيار من صور الشركة
        </button>
      </div>
    </div>
  );
}

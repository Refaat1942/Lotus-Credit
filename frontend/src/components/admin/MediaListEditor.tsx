import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Images, Loader2, Upload, X, ZoomIn } from 'lucide-react';
import type { Company, CompanyMedia } from '../../types';
import { IMAGE_ACCEPT, uploadManyCompanyMedia } from '../../utils/mediaApi';
import PhotoPicker from './PhotoPicker';

type Write = (fn: (ids: string[]) => string[], extra?: (c: Company) => Company) => void;

/** An ordered list of company photos: previews, multi-upload / drag-drop, pick existing, remove. */
export default function MediaListEditor({
  company,
  adminToken,
  docs,
  write,
  emptyText = 'لا توجد صور — ارفع من الجهاز أو اسحب الصور هنا',
}: {
  company: Company;
  adminToken: string;
  docs: CompanyMedia[];
  write: Write;
  emptyText?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preview, setPreview] = useState<CompanyMedia | null>(null);

  const addUploaded = (items: CompanyMedia[]) =>
    write(
      (ids) => [...ids, ...items.map((m) => m.id)],
      (c) => ({ ...c, media: [...(c.media || []), ...items] }),
    );

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setErrors([]);
    const { items, errors: errs } = await uploadManyCompanyMedia(company.id, adminToken, files, (d, t) =>
      setProgress(`${d} / ${t}`),
    );
    if (items.length) addUploaded(items);
    setErrors(errs);
    setProgress(null);
  };

  return (
    <div
      className="space-y-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        upload(Array.from(e.dataTransfer.files));
      }}
    >
      {docs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {docs.map((m, n) => (
            <div key={m.id} className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
              <div className="relative group">
                <button type="button" onClick={() => setPreview(m)} className="block w-full aspect-[4/3]" title="معاينة">
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
                  onClick={() => write((ids) => ids.filter((x) => x !== m.id))}
                  title="حذف من هنا"
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
        <div className="rounded-lg border border-dashed border-theme py-4 text-center text-xs text-muted">{emptyText}</div>
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
          accept={IMAGE_ACCEPT}
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
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/15 border border-white/10"
        >
          <Images className="w-4 h-4" />
          اختيار من صور الشركة
        </button>
      </div>

      {pickerOpen && (
        <PhotoPicker
          company={company}
          adminToken={adminToken}
          selected={docs.map((m) => m.id)}
          onToggle={(id) => write((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))}
          onUploaded={addUploaded}
          onClose={() => setPickerOpen(false)}
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

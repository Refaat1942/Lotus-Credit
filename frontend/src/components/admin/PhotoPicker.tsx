import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Upload } from 'lucide-react';
import type { Company } from '../../types';
import { IMAGE_ACCEPT, uploadManyCompanyMedia } from '../../utils/mediaApi';

/** Modal to toggle company photos on/off for one place, with upload from device. */
export default function PhotoPicker({
  company,
  adminToken,
  selected,
  onToggle,
  onUploaded,
  onClose,
}: {
  company: Company;
  adminToken: string;
  selected: string[];
  onToggle: (id: string) => void;
  onUploaded: (items: NonNullable<Company['media']>) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const media = company.media || [];

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setErrors([]);
    const { items, errors: errs } = await uploadManyCompanyMedia(company.id, adminToken, files, (d, t) =>
      setProgress(`${d} / ${t}`),
    );
    if (items.length) onUploaded(items);
    setErrors(errs);
    setProgress(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl bg-[#1a2332] border border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-white/10">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-60"
          >
            {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {progress ? `جاري الرفع ${progress}` : 'رفع من الجهاز'}
          </button>
          <span className="text-xs text-muted flex-1 text-center">أو اضغط على صورة لإضافتها</span>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 text-sm">
            <Check className="w-4 h-4" />
            تم
          </button>
        </div>
        {errors.length > 0 && (
          <div className="text-xs text-red-400 px-3 pt-2">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>
        )}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
          {media.length === 0 && <p className="col-span-full text-center text-sm text-muted py-8">لا توجد صور — ارفع من الجهاز</p>}
          {media.map((m) => {
            const on = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className={`relative rounded-lg overflow-hidden border ${on ? 'border-lotus-400 ring-2 ring-lotus-500/50' : 'border-white/10'}`}
              >
                <img src={m.url} alt={m.title} loading="lazy" className="w-full aspect-[4/3] object-contain bg-black/30" />
                {on && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-lotus-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <p className="text-[10px] px-1 py-0.5 truncate text-right">{m.title}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

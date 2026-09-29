import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, Camera, Check, Loader2, Play, Plus, Trash2, Upload, Wand2, X } from 'lucide-react';
import type { Company } from '../../types';
import {
  fromSimpleSteps, linearSteps, newId, simpleTemplate, toSimpleSteps, type SimpleStep,
} from '../../utils/pathway';
import { uploadManyCompanyMedia } from '../../utils/mediaApi';
import { EnableSwitch, PreviewModal } from './pathwayShared';

interface Props {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
  onAdvanced: () => void;
}

function listOf(c: Company): SimpleStep[] {
  const ordered = c.pathway && linearSteps(c.pathway);
  return ordered ? toSimpleSteps(ordered) : [];
}

export default function SimplePathwayEditor({ company, adminToken, onPatch, onAdvanced }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [photosFor, setPhotosFor] = useState<string | null>(null);
  const list = listOf(company);
  const media = company.media || [];
  const enabled = !!company.pathway?.enabled;

  // Every edit is computed from the latest state, so async uploads can't undo typing.
  const patchList = (fn: (l: SimpleStep[]) => SimpleStep[], extra?: (c: Company) => Company) =>
    onPatch((c0) => {
      const c = extra ? extra(c0) : c0;
      const next = fn(listOf(c));
      if (!next.length) {
        const rest = { ...c };
        delete rest.pathway;
        return rest;
      }
      return { ...c, pathway: fromSimpleSteps(next, !!c.pathway?.enabled) };
    });

  const setStep = (id: string, patch: Partial<SimpleStep>) =>
    patchList((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (i: number, dir: -1 | 1) =>
    patchList((l) => {
      const j = i + dir;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addStep = () => patchList((l) => [...l, { id: newId('step'), text: '' }]);

  const removeStep = (s: SimpleStep) => {
    if (s.text.trim() && !confirm('حذف هذه الخطوة؟')) return;
    patchList((l) => l.filter((x) => x.id !== s.id));
  };

  if (!list.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          لو الشركة دي ليها طريقة صرف مختلفة، اكتب خطواتها بالترتيب. الصيدلي هيشوفها خطوة خطوة بدل المرشد العادي.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => patchList(() => simpleTemplate(company))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600"
          >
            <Wand2 className="w-4 h-4" />
            املأ الخطوات من شروط الشركة
          </button>
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm hover:bg-white/15 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            ابدأ فاضي
          </button>
        </div>
        <button type="button" onClick={onAdvanced} className="text-xs text-muted hover:text-lotus-400 underline">
          محتاج أسئلة (نعم / لا) وتفرعات؟ التصميم المتقدم
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EnableSwitch
          enabled={enabled}
          onChange={(v) => onPatch((c) => (c.pathway ? { ...c, pathway: { ...c.pathway, enabled: v } } : c))}
        />
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30"
        >
          <Play className="w-3.5 h-3.5" />
          تجربة
        </button>
      </div>

      <ol className="space-y-2">
        {list.map((s, i) => {
          const photos = (s.mediaIds || []).map((id) => media.find((m) => m.id === id)).filter(Boolean) as typeof media;
          return (
            <li key={s.id} className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="w-7 h-7 mt-1 rounded-full bg-lotus-500/25 text-lotus-300 text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <textarea
                  rows={Math.min(9, Math.max(2, s.text.split("\n").length + Math.floor(s.text.length / 90)))}
                  value={s.text}
                  placeholder="اكتب الخطوة هنا…"
                  onChange={(e) => setStep(s.id, { text: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg bg-black/20 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((m) => (
                    <div key={m.id} className="relative w-16 h-12 rounded-md overflow-hidden border border-white/10 bg-black/20">
                      <img src={m.url} alt="" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        title="إزالة"
                        onClick={() => setStep(s.id, { mediaIds: s.mediaIds?.filter((x) => x !== m.id) })}
                        className="absolute top-0 left-0 p-0.5 bg-black/70 rounded-br"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPhotosFor(s.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    صورة
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" title="لأعلى" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded hover:bg-white/10 disabled:opacity-20">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" title="لأسفل" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="p-1 rounded hover:bg-white/10 disabled:opacity-20">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button type="button" title="حذف" onClick={() => removeStep(s)} className="p-1 rounded text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={addStep}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-lotus-500/40 text-lotus-300 text-sm hover:bg-lotus-500/10"
      >
        <Plus className="w-4 h-4" />
        إضافة خطوة
      </button>

      <div className="flex flex-wrap justify-between gap-2 pt-1">
        <button type="button" onClick={onAdvanced} className="text-xs text-muted hover:text-lotus-400 underline">
          محتاج أسئلة (نعم / لا) وتفرعات؟ التصميم المتقدم
        </button>
        <button
          type="button"
          onClick={() => confirm('حذف كل الخطوات؟ الشركة هترجع للمرشد العادي.') && patchList(() => [])}
          className="text-xs text-red-400 hover:underline"
        >
          حذف المسار
        </button>
      </div>

      {previewOpen && company.pathway && (
        <PreviewModal company={company} pathway={company.pathway} onClose={() => setPreviewOpen(false)} />
      )}

      {photosFor && (
        <PhotoPicker
          company={company}
          adminToken={adminToken}
          selected={list.find((s) => s.id === photosFor)?.mediaIds || []}
          onToggle={(mediaId) =>
            patchList((l) =>
              l.map((s) => {
                if (s.id !== photosFor) return s;
                const ids = s.mediaIds || [];
                return { ...s, mediaIds: ids.includes(mediaId) ? ids.filter((x) => x !== mediaId) : [...ids, mediaId] };
              }),
            )
          }
          onUploaded={(items) =>
            patchList(
              (l) =>
                l.map((s) =>
                  s.id === photosFor ? { ...s, mediaIds: [...(s.mediaIds || []), ...items.map((m) => m.id)] } : s,
                ),
              (c) => ({ ...c, media: [...(c.media || []), ...items] }),
            )
          }
          onClose={() => setPhotosFor(null)}
        />
      )}
    </div>
  );
}

function PhotoPicker({
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

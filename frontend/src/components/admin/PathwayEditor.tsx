import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowDown, ArrowUp, Flag, Images, Loader2, Play, Plus, Trash2, Upload, Wand2, X,
} from 'lucide-react';
import type { Company, CompanyPathway, PathwayStep } from '../../types';
import PathwayCoach from '../PathwayCoach';
import {
  NODE_H, NODE_W, defaultPathwayTemplate, emptyStep, layoutPathway, newId, pathwayWarnings,
  type LayoutNode,
} from '../../utils/pathway';
import { uploadManyCompanyMedia } from '../../utils/mediaApi';

interface PathwayEditorProps {
  company: Company;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
}

const END = '__end__';
const NEW = '__new__';

export default function PathwayEditor({ company, adminToken, onPatch }: PathwayEditorProps) {
  const pathway = company.pathway;
  const [selectedId, setSelectedId] = useState<string | null>(pathway?.startId ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const patchPathway = (fn: (p: CompanyPathway) => CompanyPathway) =>
    onPatch((c) => (c.pathway ? { ...c, pathway: fn(c.pathway) } : c));

  const patchStep = (id: string, fn: (s: PathwayStep) => PathwayStep) =>
    patchPathway((p) => ({ ...p, steps: p.steps.map((s) => (s.id === id ? fn(s) : s)) }));

  const createFromTemplate = () => {
    if (pathway?.steps.length && !confirm('سيتم استبدال المسار الحالي بالقالب الافتراضي. متابعة؟')) return;
    const tpl = defaultPathwayTemplate(company);
    onPatch((c) => ({ ...c, pathway: tpl }));
    setSelectedId(tpl.startId);
  };

  const createBlank = () => {
    const first = emptyStep('البداية');
    onPatch((c) => ({ ...c, pathway: { enabled: false, startId: first.id, steps: [first] } }));
    setSelectedId(first.id);
  };

  if (!pathway) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted leading-relaxed">
          لو الشركة دي شروط صرفها مختلفة، صمّم لها مسار خاص: خطوات وأسئلة وأزرار، وكل زر يودّي لخطوة تانية. لما
          تفعّله، الصيدلي هيمشي على المسار ده بدل المرشد العادي.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createFromTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600"
          >
            <Wand2 className="w-4 h-4" />
            ابدأ من القالب الافتراضي
          </button>
          <button
            type="button"
            onClick={createBlank}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm hover:bg-white/15 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            مسار فارغ
          </button>
        </div>
      </div>
    );
  }

  const selected = pathway.steps.find((s) => s.id === selectedId) || null;
  const warnings = pathwayWarnings(pathway);

  const addStep = () => {
    const step = emptyStep();
    patchPathway((p) => ({ ...p, steps: [...p.steps, step] }));
    setSelectedId(step.id);
  };

  const deleteStep = (id: string) => {
    if (pathway.steps.length === 1) {
      alert('المسار لازم يكون فيه خطوة واحدة على الأقل');
      return;
    }
    if (!confirm('حذف هذه الخطوة؟ الأزرار اللي بتودّي لها هتبقى «نهاية المسار».')) return;
    patchPathway((p) => {
      const steps = p.steps
        .filter((s) => s.id !== id)
        .map((s) => ({ ...s, options: s.options.map((o) => (o.next === id ? { ...o, next: null } : o)) }));
      return { ...p, steps, startId: p.startId === id ? steps[0].id : p.startId };
    });
    setSelectedId(pathway.startId === id ? pathway.steps.find((s) => s.id !== id)!.id : pathway.startId);
  };

  const removePathway = () => {
    if (!confirm('حذف المسار المخصص بالكامل؟ الشركة هترجع للمرشد العادي.')) return;
    onPatch((c) => {
      const next = { ...c };
      delete next.pathway;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span
            className={`relative w-11 h-6 rounded-full transition-colors ${pathway.enabled ? 'bg-emerald-500' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${pathway.enabled ? 'right-0.5' : 'right-[22px]'}`}
            />
          </span>
          <input
            type="checkbox"
            className="hidden"
            checked={pathway.enabled}
            onChange={(e) => patchPathway((p) => ({ ...p, enabled: e.target.checked }))}
          />
          <span className="text-sm font-medium">
            {pathway.enabled ? 'المسار المخصص مفعّل — الصيدلي يشوفه بدل المرشد العادي' : 'المسار غير مفعّل (مسودة)'}
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30"
          >
            <Play className="w-3.5 h-3.5" />
            تجربة المسار
          </button>
          <button
            type="button"
            onClick={addStep}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lotus-500 text-white text-xs font-medium hover:bg-lotus-600"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة خطوة
          </button>
          <button
            type="button"
            onClick={createFromTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15"
          >
            <Wand2 className="w-3.5 h-3.5" />
            القالب الافتراضي
          </button>
          <button
            type="button"
            onClick={removePathway}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 text-xs hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف المسار
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300 space-y-0.5">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {w}
            </p>
          ))}
        </div>
      )}

      <FlowCanvas
        pathway={pathway}
        selectedId={selectedId}
        onSelect={setSelectedId}
        mediaCount={(s) => s.mediaIds?.length || 0}
      />

      {selected ? (
        <StepEditor
          key={selected.id}
          company={company}
          pathway={pathway}
          step={selected}
          adminToken={adminToken}
          onPatch={onPatch}
          onPatchStep={(fn) => patchStep(selected.id, fn)}
          onPatchPathway={patchPathway}
          onSelect={setSelectedId}
          onDelete={() => deleteStep(selected.id)}
        />
      ) : (
        <p className="text-center text-sm text-muted py-4">اضغط على أي خطوة في الرسم لتعديلها</p>
      )}

      {previewOpen &&
        createPortal(
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={() => setPreviewOpen(false)}>
          <div
            className="w-full max-w-lg h-[88vh] rounded-2xl bg-[var(--color-bg-start)] border border-white/10 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-xs text-muted">معاينة — كما سيراها الصيدلي</span>
              <button type="button" onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 px-3 overflow-hidden">
              <PathwayCoach company={{ ...company, pathway }} preview />
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}

function FlowCanvas({
  pathway,
  selectedId,
  onSelect,
  mediaCount,
}: {
  pathway: CompanyPathway;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mediaCount: (s: PathwayStep) => number;
}) {
  const { nodes, width, height } = useMemo(() => layoutPathway(pathway), [pathway]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.step.id, n])), [nodes]);

  const edges: { key: string; d: string; label: string; lx: number; ly: number; active: boolean }[] = [];
  for (const src of nodes) {
    // several buttons leading to the same step are drawn as one arrow
    const groups = new Map<string, string[]>();
    for (const opt of src.step.options) {
      if (opt.next && byId.has(opt.next)) groups.set(opt.next, [...(groups.get(opt.next) || []), opt.label || '—']);
    }
    const targets = [...groups.keys()];
    targets.forEach((target, i) => {
      const dst = byId.get(target)!;
      const labels = groups.get(target)!;
      const label = labels.length === 1 ? labels[0] : `${labels.length} أزرار`;
      const key = `${src.step.id}->${target}`;
      const active = src.step.id === selectedId || dst.step.id === selectedId;
      const spread = (i - (targets.length - 1) / 2) * 26;
      if (dst.level > src.level) {
        const x1 = src.x + NODE_W / 2 + spread;
        const y1 = src.y + NODE_H;
        const x2 = dst.x + NODE_W / 2;
        const y2 = dst.y;
        const my = (y1 + y2) / 2;
        // label sits on the curve near its source so labels from sibling steps don't collide
        const t = targets.length > 1 ? 0.62 : 0.32;
        const b = (p0: number, p1: number, p2: number, p3: number) =>
          (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3;
        edges.push({
          key,
          d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2 - 6}`,
          label,
          lx: b(x1, x1, x2, x2),
          ly: b(y1, my, my, y2),
          active,
        });
      } else if (dst.level === src.level) {
        const leftward = dst.x < src.x;
        const x1 = leftward ? src.x : src.x + NODE_W;
        const x2 = leftward ? dst.x + NODE_W + 6 : dst.x - 6;
        const y = src.y + NODE_H / 2;
        edges.push({ key, d: `M${x1},${y} L${x2},${y}`, label, lx: (x1 + x2) / 2, ly: y - 14, active });
      } else {
        // loop back to an earlier step: route around the left side
        const x1 = src.x;
        const y1 = src.y + NODE_H / 2;
        const x2 = dst.x;
        const y2 = dst.y + NODE_H / 2;
        const bend = Math.min(x1, x2) - 45 - i * 14;
        edges.push({ key, d: `M${x1},${y1} C${bend},${y1} ${bend},${y2} ${x2 - 6},${y2}`, label, lx: bend + 12, ly: (y1 + y2) / 2, active });
      }
    });
  }

  const canvasW = width + 80;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 overflow-auto max-h-[560px]">
      <div dir="ltr" className="relative" style={{ width: canvasW, height, minWidth: '100%' }}>
        <svg width={canvasW} height={height} className="absolute inset-0 pointer-events-none">
          <defs>
            <marker id="pw-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          <g transform="translate(60,0)">
            {edges.map((e) => (
              <g key={e.key} className={e.active ? 'text-lotus-400' : 'text-slate-500'}>
                <path d={e.d} fill="none" stroke="currentColor" strokeWidth={e.active ? 2.2 : 1.5} markerEnd="url(#pw-arrow)" />
              </g>
            ))}
            {edges.map((e) => {
              const text = e.label.length > 18 ? `${e.label.slice(0, 17)}…` : e.label || '—';
              const w = text.length * 6.2 + 12;
              return (
                <g key={`${e.key}-l`}>
                  <rect x={e.lx - w / 2} y={e.ly - 9} width={w} height={18} rx={9} className="fill-slate-800" opacity={0.92} />
                  <text
                    x={e.lx}
                    y={e.ly + 4}
                    textAnchor="middle"
                    className={e.active ? 'fill-lotus-300' : 'fill-slate-300'}
                    style={{ fontSize: 10.5, direction: 'rtl' }}
                  >
                    {text}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {nodes.map((n) => (
          <FlowNode
            key={n.step.id}
            node={n}
            offsetX={60}
            isStart={n.step.id === pathway.startId}
            selected={n.step.id === selectedId}
            images={mediaCount(n.step)}
            onClick={() => onSelect(n.step.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FlowNode({
  node,
  offsetX,
  isStart,
  selected,
  images,
  onClick,
}: {
  node: LayoutNode;
  offsetX: number;
  isStart: boolean;
  selected: boolean;
  images: number;
  onClick: () => void;
}) {
  const isEnd = node.step.options.length === 0;
  return (
    <button
      type="button"
      dir="rtl"
      onClick={onClick}
      style={{ left: node.x + offsetX, top: node.y, width: NODE_W, height: NODE_H }}
      className={`absolute rounded-xl border px-3 py-2 text-right transition-all flex flex-col justify-between ${
        selected
          ? 'border-lotus-400 bg-lotus-500/25 ring-2 ring-lotus-500/40 shadow-lg shadow-lotus-500/20'
          : !node.reachable
            ? 'border-dashed border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10'
            : 'border-white/15 bg-[#1a2332] hover:border-lotus-500/50'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isStart && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 shrink-0">بداية</span>}
        {isEnd && <Flag className="w-3 h-3 text-rose-300 shrink-0" />}
        <span className="text-xs font-bold text-white truncate">{node.step.title || '—'}</span>
      </div>
      <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{node.step.message || 'بدون رسالة'}</p>
      <div className="flex gap-2 text-[9px] text-slate-500">
        <span>{node.step.options.length} زر</span>
        {images > 0 && <span>🖼 {images}</span>}
        {!node.reachable && <span className="text-amber-400">غير متصلة</span>}
      </div>
    </button>
  );
}

function StepEditor({
  company,
  pathway,
  step,
  adminToken,
  onPatch,
  onPatchStep,
  onPatchPathway,
  onSelect,
  onDelete,
}: {
  company: Company;
  pathway: CompanyPathway;
  step: PathwayStep;
  adminToken: string;
  onPatch: (fn: (c: Company) => Company) => void;
  onPatchStep: (fn: (s: PathwayStep) => PathwayStep) => void;
  onPatchPathway: (fn: (p: CompanyPathway) => CompanyPathway) => void;
  onSelect: (id: string) => void;
  onDelete: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const media = company.media || [];
  const stepImages = (step.mediaIds || []).map((id) => media.find((m) => m.id === id)).filter(Boolean) as typeof media;
  const isStart = pathway.startId === step.id;

  const set = <K extends keyof PathwayStep>(key: K, value: PathwayStep[K]) => onPatchStep((s) => ({ ...s, [key]: value }));

  const setOption = (optId: string, patch: Partial<PathwayStep['options'][number]>) =>
    onPatchStep((s) => ({ ...s, options: s.options.map((o) => (o.id === optId ? { ...o, ...patch } : o)) }));

  const moveOption = (index: number, dir: -1 | 1) =>
    onPatchStep((s) => {
      const options = [...s.options];
      const j = index + dir;
      if (j < 0 || j >= options.length) return s;
      [options[index], options[j]] = [options[j], options[index]];
      return { ...s, options };
    });

  const setTarget = (optId: string, value: string) => {
    if (value === NEW) {
      const opt = step.options.find((o) => o.id === optId);
      const created = emptyStep(opt?.label || 'خطوة جديدة');
      onPatchPathway((p) => ({
        ...p,
        steps: [
          ...p.steps.map((s) =>
            s.id === step.id ? { ...s, options: s.options.map((o) => (o.id === optId ? { ...o, next: created.id } : o)) } : s,
          ),
          created,
        ],
      }));
      onSelect(created.id);
      return;
    }
    setOption(optId, { next: value === END ? null : value });
  };

  const toggleImage = (id: string) =>
    onPatchStep((s) => {
      const ids = s.mediaIds || [];
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...s, mediaIds: next.length ? next : undefined };
    });

  const uploadImages = async (files: File[]) => {
    if (!files.length) return;
    setUploadErrors([]);
    const { items, errors } = await uploadManyCompanyMedia(company.id, adminToken, files, (done, total) =>
      setProgress({ done, total }),
    );
    if (items.length) {
      onPatch((c) => ({
        ...c,
        media: [...(c.media || []), ...items],
        pathway: c.pathway && {
          ...c.pathway,
          steps: c.pathway.steps.map((s) =>
            s.id === step.id ? { ...s, mediaIds: [...(s.mediaIds || []), ...items.map((i) => i.id)] } : s,
          ),
        },
      }));
    }
    setUploadErrors(errors);
    setProgress(null);
  };

  const inputCls =
    'w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50';

  return (
    <div className="rounded-xl border border-lotus-500/30 bg-lotus-500/5 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-sm">تعديل الخطوة: {step.title || '—'}</h4>
        <div className="flex gap-2">
          {!isStart && (
            <button
              type="button"
              onClick={() => onPatchPathway((p) => ({ ...p, startId: step.id }))}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            >
              اجعلها خطوة البداية
            </button>
          )}
          <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10" title="حذف الخطوة">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">اسم الخطوة (يظهر في الرسم)</label>
          <input value={step.title} onChange={(e) => set('title', e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">زر رابط (اختياري)</label>
            <input
              value={step.link?.label || ''}
              placeholder="مثال: فتح البوابة"
              onChange={(e) => {
                const label = e.target.value;
                set('link', label || step.link?.url ? { label, url: step.link?.url || '' } : undefined);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">الرابط</label>
            <input
              dir="ltr"
              value={step.link?.url || ''}
              placeholder="https://"
              onChange={(e) => {
                const url = e.target.value;
                set('link', url || step.link?.label ? { label: step.link?.label || '', url } : undefined);
              }}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">رسالة المرشد للصيدلي (استخدم **نص** للتغميق)</label>
        <textarea rows={3} value={step.message} onChange={(e) => set('message', e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">نقاط إضافية (سطر لكل نقطة — اختياري)</label>
        <textarea
          rows={3}
          value={(step.bullets || []).join('\n')}
          onChange={(e) => {
            const lines = e.target.value.split('\n');
            set('bullets', lines.some((l) => l.trim()) ? lines : undefined);
          }}
          className={inputCls}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs text-slate-400">صور الخطوة ({stepImages.length})</label>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImages(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={!!progress}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-lotus-500/20 text-xs hover:bg-lotus-500/30 disabled:opacity-50"
            >
              {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {progress ? `${progress.done} / ${progress.total}` : 'رفع صور من الجهاز'}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15"
            >
              <Images className="w-3.5 h-3.5" />
              {pickerOpen ? 'إغلاق' : 'اختيار من صور الشركة'}
            </button>
          </div>
        </div>
        {uploadErrors.length > 0 && (
          <div className="text-xs text-red-400">{uploadErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
        )}
        {stepImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stepImages.map((m) => (
              <div key={m.id} className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                <img src={m.url} alt={m.title} className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => toggleImage(m.id)}
                  className="absolute top-0.5 left-0.5 p-0.5 rounded bg-black/70"
                  title="إزالة من الخطوة"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        {pickerOpen && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2 rounded-xl bg-black/20">
            {media.length === 0 && <p className="col-span-full text-center text-xs text-muted py-4">لا توجد صور للشركة</p>}
            {media.map((m) => {
              const on = step.mediaIds?.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleImage(m.id)}
                  className={`rounded-lg overflow-hidden border text-right ${on ? 'border-lotus-400 ring-2 ring-lotus-500/40' : 'border-white/10'}`}
                >
                  <img src={m.url} alt={m.title} loading="lazy" className="w-full aspect-[4/3] object-contain bg-black/30" />
                  <p className="text-[9px] px-1 py-0.5 truncate">{m.title}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">
          أزرار الإجابة — كل زر يودّي لخطوة (بدون أزرار = نهاية المسار)
        </label>
        {step.options.map((opt, i) => (
          <div key={opt.id} className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white/5">
            <div className="flex flex-col">
              <button type="button" disabled={i === 0} onClick={() => moveOption(i, -1)} className="p-0.5 disabled:opacity-20">
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={i === step.options.length - 1}
                onClick={() => moveOption(i, 1)}
                className="p-0.5 disabled:opacity-20"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
            <input
              value={opt.label}
              placeholder="نص الزر"
              onChange={(e) => setOption(opt.id, { label: e.target.value })}
              className="flex-1 min-w-[140px] py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-sm"
            />
            <span className="text-xs text-muted">←</span>
            <select
              value={opt.next ?? END}
              onChange={(e) => setTarget(opt.id, e.target.value)}
              className="min-w-[150px] py-1.5 px-2 rounded-lg bg-[#1a2332] border border-white/10 text-sm"
            >
              {pathway.steps
                .filter((s) => s.id !== step.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || '—'}
                  </option>
                ))}
              <option value={END}>🏁 نهاية المسار</option>
              <option value={NEW}>➕ خطوة جديدة…</option>
            </select>
            <button
              type="button"
              onClick={() => onPatchStep((s) => ({ ...s, options: s.options.filter((o) => o.id !== opt.id) }))}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
              title="حذف الزر"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onPatchStep((s) => ({ ...s, options: [...s.options, { id: newId('opt'), label: '', next: null }] }))}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة زر
        </button>
      </div>
    </div>
  );
}

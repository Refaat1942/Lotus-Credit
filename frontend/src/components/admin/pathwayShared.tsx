import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Company, CompanyPathway } from '../../types';
import PathwayCoach from '../PathwayCoach';

export function EnableSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'right-0.5' : 'right-[22px]'}`} />
      </span>
      <input type="checkbox" className="hidden" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm font-medium">
        {enabled ? 'مفعّل — الصيدلي يشوف الخطوات دي' : 'غير مفعّل (مسودة)'}
      </span>
    </label>
  );
}

export function PreviewModal({
  company,
  pathway,
  onClose,
}: {
  company: Company;
  pathway: CompanyPathway;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg h-[88vh] rounded-2xl bg-[var(--color-bg-start)] border border-white/10 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <span className="text-xs text-muted">معاينة — كما سيراها الصيدلي</span>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-3 overflow-hidden">
          <PathwayCoach company={{ ...company, pathway }} preview />
        </div>
      </div>
    </div>,
    document.body,
  );
}

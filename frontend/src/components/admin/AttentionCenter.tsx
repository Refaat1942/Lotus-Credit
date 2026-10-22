import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bell, ChevronLeft, Info, ShieldAlert, X } from 'lucide-react';

interface AttentionItem {
  id: string;
  level: 'urgent' | 'warn' | 'tip';
  title: string;
  detail: string;
  tab?: string;
}

const LEVEL = {
  urgent: { icon: ShieldAlert, box: 'border-red-500/40 bg-red-500/10', ic: 'text-red-400', tag: 'مهم' },
  warn: { icon: AlertTriangle, box: 'border-amber-500/40 bg-amber-500/10', ic: 'text-amber-400', tag: 'انتبه' },
  tip: { icon: Info, box: 'border-lotus-500/30 bg-lotus-500/10', ic: 'text-lotus-400', tag: 'نصيحة' },
};

/**
 * A bell in the admin panel with what needs the admin's decision (new devices, failed sign-ins, missing backups…).
 * The list opens by itself once when the panel opens and anything important is waiting.
 */
export default function AttentionCenter({
  adminToken,
  canOpenTab,
  onOpenTab,
}: {
  adminToken: string;
  canOpenTab: (tab: string) => boolean;
  onOpenTab: (tab: string) => void;
}) {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch('/api/admin/attention', { headers: { Authorization: `Bearer ${adminToken}` } })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setItems(d.items || []))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [adminToken]);

  const important = items.filter((i) => i.level !== 'tip');
  useEffect(() => {
    if (!shown && important.length) {
      setOpen(true);
      setShown(true);
    }
  }, [important.length, shown]);

  const go = (tab?: string) => {
    if (tab && canOpenTab(tab)) onOpenTab(tab);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl glass hover:bg-white/10"
        title="محتاج قرارك"
      >
        <Bell className="w-4 h-4" />
        {important.length > 0 && (
          <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {important.length}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[160] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-start)] border border-theme p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-lotus-400" />
                  محتاج قرارك
                </h2>
                <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">كله تمام ✓ — مفيش حاجة مستنياك دلوقتي.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => {
                    const L = LEVEL[it.level];
                    const Icon = L.icon;
                    const clickable = !!it.tab && canOpenTab(it.tab);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => go(it.tab)}
                        disabled={!clickable}
                        className={`w-full text-right flex items-start gap-3 rounded-xl border p-3 ${L.box} ${clickable ? 'hover:brightness-125' : 'cursor-default'}`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${L.ic}`} />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-primary">{it.title}</span>
                            <span className={`text-[10px] px-1.5 rounded-full bg-black/20 ${L.ic}`}>{L.tag}</span>
                          </span>
                          <span className="block text-xs text-muted mt-0.5 leading-relaxed">{it.detail}</span>
                        </span>
                        {clickable && <ChevronLeft className="w-4 h-4 mt-1 text-muted shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

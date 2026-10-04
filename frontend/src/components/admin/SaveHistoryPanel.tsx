import { useEffect, useState } from 'react';
import { History, Loader2, Undo2 } from 'lucide-react';

interface Version {
  id: number;
  savedAt: string;
  savedBy: string;
  note: string;
  size: number;
}

/** Every save of the companies data is kept in the database; any of them can be brought back. */
export default function SaveHistoryPanel({ adminToken, onRestored }: { adminToken: string; onRestored: () => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const auth = { Authorization: `Bearer ${adminToken}` };

  const load = () =>
    fetch('/api/admin/versions', { headers: auth })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setVersions)
      .catch(() => setError('تعذر تحميل سجل الحفظ'));

  useEffect(() => {
    load();
  }, []);

  const restore = async (v: Version) => {
    if (!confirm(`الرجوع لبيانات الشركات زي ما كانت في حفظ رقم ${v.id} (${new Date(v.savedAt).toLocaleString('ar-EG')})؟\n\nالحالي مش هيضيع — هيتسجل كحفظ جديد وتقدر ترجعله.`)) return;
    setBusy(v.id);
    try {
      const res = await fetch(`/api/admin/versions/${v.id}/restore`, { method: 'POST', headers: auth });
      if (!res.ok) throw new Error();
      await load();
      onRestored();
    } catch {
      setError('فشل الرجوع');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-lotus-400" />
          سجل الحفظ (بيانات الشركات)
        </h2>
        <p className="text-xs text-muted mt-1">
          كل مرة حد يحفظ، نسخة كاملة من بيانات الشركات بتتسجل في قاعدة البيانات (آخر 300 حفظ). لو حصل أي غلط، ارجع لأي
          حفظ قبله.
        </p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {versions === null ? (
        <p className="text-sm text-muted text-center py-4">جاري التحميل...</p>
      ) : (
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
          {versions.map((v, i) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">
              <span className="text-xs text-muted tabular-nums w-10">#{v.id}</span>
              <span className="flex-1 min-w-[160px]">
                {v.note} <span className="text-muted text-xs">— {v.savedBy}</span>
              </span>
              <span className="text-xs text-muted">{new Date(v.savedAt).toLocaleString('ar-EG')}</span>
              {i === 0 ? (
                <span className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300">الحالي</span>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => restore(v)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50"
                >
                  {busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  رجوع للحفظ ده
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

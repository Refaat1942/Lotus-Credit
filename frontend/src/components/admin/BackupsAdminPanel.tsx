import { useEffect, useState } from 'react';
import { Database, History, Loader2, RotateCcw, Trash2 } from 'lucide-react';

interface BackupInfo {
  name: string;
  reason: string;
  createdAt: string;
  sizeBytes: number;
}

const REASON_LABELS: Record<string, string> = {
  startup: 'تلقائي عند التشغيل',
  scheduled: 'تلقائي يومي',
  manual: 'يدوي',
  'before-restore': 'قبل استرجاع نسخة',
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsAdminPanel({ adminToken }: { adminToken: string }) {
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${adminToken}` } });
      if (!res.ok) throw new Error();
      setBackups(await res.json());
    } catch {
      setError('فشل تحميل قائمة النسخ الاحتياطية');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const backupNow = async () => {
    setBusy('now');
    setError('');
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('فشل إنشاء نسخة احتياطية');
    } finally {
      setBusy('');
    }
  };

  const restore = async (name: string) => {
    if (
      !confirm(
        'استرجاع هذه النسخة سيستبدل كل البيانات والصور الحالية بما كان محفوظاً وقتها. سيتم أخذ نسخة احتياطية من الوضع الحالي أولاً تلقائياً. هل تريد الاستمرار؟',
      )
    ) {
      return;
    }
    setBusy(name);
    setError('');
    try {
      const res = await fetch(`/api/admin/backups/${name}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error();
      alert('تم الاسترجاع بنجاح. سيتم تحديث الصفحة الآن.');
      window.location.reload();
    } catch {
      setError('فشل الاسترجاع');
      setBusy('');
    }
  };

  const remove = async (name: string) => {
    if (!confirm('حذف هذه النسخة الاحتياطية نهائياً؟')) return;
    setBusy(name);
    setError('');
    try {
      const res = await fetch(`/api/admin/backups/${name}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('فشل الحذف');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-lotus-400" />
            النسخ الاحتياطي
          </h2>
          <p className="text-xs text-muted mt-1">نسخة تلقائية كل 24 ساعة، ويُحتفظ بآخر {14} نسخة</p>
        </div>
        <button
          type="button"
          onClick={backupNow}
          disabled={busy === 'now'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-50"
        >
          {busy === 'now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
          نسخة احتياطية الآن
        </button>
      </div>

      {error && <p className="text-xs text-red-400 rounded-lg bg-red-500/10 px-3 py-2">{error}</p>}

      {backups === null ? (
        <p className="text-sm text-muted py-6 text-center">جاري التحميل...</p>
      ) : backups.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">لا توجد نسخ احتياطية بعد</p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {backups.map((b) => (
            <div
              key={b.name}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{new Date(b.createdAt).toLocaleString('ar-EG')}</p>
                <p className="text-xs text-muted">
                  {REASON_LABELS[b.reason] || b.reason} · {formatSize(b.sizeBytes)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === b.name}
                  onClick={() => restore(b.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {busy === b.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  استرجاع
                </button>
                <button
                  type="button"
                  disabled={busy === b.name}
                  onClick={() => remove(b.name)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

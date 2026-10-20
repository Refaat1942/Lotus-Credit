import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, KeyRound, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Company } from '../../types';
import type { Account } from '../../utils/session';
import type { PortalLogin } from '../../utils/portalLogins';

const blank = (): PortalLogin => ({
  id: `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  companyId: '',
  label: '',
  url: '',
  username: '',
  password: '',
  note: '',
});

/** Owner only: the company-portal usernames and passwords one branch account sees (read-only on its side). */
export default function PortalLoginsEditor({
  user,
  users,
  companies,
  adminToken,
  onClose,
}: {
  user: Account;
  users: Account[];
  companies: Company[];
  adminToken: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PortalLogin[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const auth = { Authorization: `Bearer ${adminToken}` };
  const sorted = [...companies].sort((a, b) => (a.order || 0) - (b.order || 0));
  const byId = Object.fromEntries(companies.map((c) => [c.id, c]));

  const fetchList = (id: string) =>
    fetch(`/api/admin/users/${id}/logins`, { headers: auth }).then((r) => {
      if (!r.ok) throw new Error('تعذر التحميل');
      return r.json() as Promise<PortalLogin[]>;
    });

  useEffect(() => {
    fetchList(user.id)
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, [user.id]);

  const update = (i: number, patch: Partial<PortalLogin>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const importFrom = async (id: string) => {
    if (!id) return;
    try {
      const list = await fetchList(id);
      setRows((r) => [...(r || []), ...list.map((l) => ({ ...l, id: blank().id }))]);
    } catch (e) {
      setError((e as Error).message);
    }
    setCopyFrom('');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const logins = rows!.filter((r) => r.companyId || r.label || r.username || r.password || r.url);
      const res = await fetch(`/api/admin/users/${user.id}/logins`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logins }),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50';
  const others = users.filter((u) => u.id !== user.id);

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-start)] border border-theme p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-lotus-400" />
              بيانات دخول البوابات — {user.name}
            </h3>
            <p className="text-xs text-muted mt-1">
              الفرع بيشوفها ثابتة (يفتح البوابة وينسخ اليوزر والباسورد) ومايقدرش يعدّل فيها. التعديل والحذف من هنا بس.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {rows === null ? (
          <p className="text-sm text-muted text-center py-6">{error || 'جاري التحميل...'}</p>
        ) : (
          <>
            {rows.length === 0 && <p className="text-sm text-muted text-center py-3">لسه مفيش بيانات — اضغط «إضافة بوابة»</p>}
            {rows.map((r, i) => {
              const co = byId[r.companyId];
              return (
                <div key={r.id} className="rounded-xl border border-white/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-lotus-500/20 text-lotus-300 text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                    <select
                      value={r.companyId}
                      onChange={(e) => update(i, { companyId: e.target.value })}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-primary focus:outline-none"
                    >
                      <option value="" className="text-black">
                        — بوابة عامة (مش تبع شركة) —
                      </option>
                      {sorted.map((c) => (
                        <option key={c.id} value={c.id} className="text-black">
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 pr-8">
                    <input value={r.label} onChange={(e) => update(i, { label: e.target.value })} placeholder={co ? `الاسم الظاهر (${co.nameAr})` : 'الاسم الظاهر (مثلاً: بوابة يوداوي)'} className={input} />
                    <input dir="ltr" value={r.url} onChange={(e) => update(i, { url: e.target.value })} placeholder={co?.approvalPortal || 'رابط البوابة'} className={input} />
                    <input dir="ltr" autoComplete="off" value={r.username} onChange={(e) => update(i, { username: e.target.value })} placeholder="اسم المستخدم" className={input} />
                    <input dir="ltr" autoComplete="off" value={r.password} onChange={(e) => update(i, { password: e.target.value })} placeholder="كلمة المرور" className={input} />
                    <input value={r.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="ملاحظة (اختياري)" className={`${input} sm:col-span-2`} />
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRows([...rows, blank()])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500/20 text-lotus-300 text-sm font-medium hover:bg-lotus-500/30"
              >
                <Plus className="w-4 h-4" />
                إضافة بوابة
              </button>
              {others.length > 0 && (
                <label className="inline-flex items-center gap-2 text-sm text-muted">
                  <Copy className="w-4 h-4" />
                  نسخ من:
                  <select
                    value={copyFrom}
                    onChange={(e) => {
                      setCopyFrom(e.target.value);
                      importFrom(e.target.value);
                    }}
                    className="py-1.5 px-2 rounded-lg bg-white/5 border border-white/10 text-sm text-primary"
                  >
                    <option value="" className="text-black">
                      فرع تاني…
                    </option>
                    {others.map((u) => (
                      <option key={u.id} value={u.id} className="text-black">
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-sm">
                إلغاء
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

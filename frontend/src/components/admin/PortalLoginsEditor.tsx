import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Copy, KeyRound, ListPlus, Loader2, Plus, Trash2, X } from 'lucide-react';
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

/** A row is kept when it holds something to sign in with (rows only picked from the company list are dropped). */
const hasData = (r: PortalLogin) => !!(r.username || r.password || r.note || (!r.companyId && r.url));

/** Owner only: the link usernames and passwords one branch account sees (read-only on its side). */
export default function PortalLoginsEditor({
  user,
  users,
  companies,
  adminToken,
  onClose,
  onSaved,
}: {
  user: Account;
  users: Account[];
  companies: Company[];
  adminToken: string;
  onClose: () => void;
  onSaved: (count: number) => void;
}) {
  const [rows, setRows] = useState<PortalLogin[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [saved, setSaved] = useState('[]');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const dirty = rows !== null && JSON.stringify(rows.filter(hasData)) !== saved;
  // closing never throws away typed logins without asking
  const close = () => {
    if (dirty && !confirm('في بيانات لسه ماتحفظتش. تقفل من غير حفظ؟')) return;
    onClose();
  };
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
      .then((list) => {
        setRows(list);
        setSaved(JSON.stringify(list));
      })
      .catch((e) => setError((e as Error).message));
  }, [user.id]);

  // one empty row for every company not in the list yet, so only username and password are left to type
  const addAllCompanies = () =>
    setRows((r) => [
      ...(r || []),
      ...sorted.filter((c) => !(r || []).some((x) => x.companyId === c.id)).map((c) => ({ ...blank(), id: `${blank().id}-${c.id}`, companyId: c.id })),
    ]);

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
      const logins = rows!.filter(hasData);
      const res = await fetch(`/api/admin/users/${user.id}/logins`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ logins }),
      });
      if (!res.ok) throw new Error('فشل الحفظ — جرّب تاني');
      onSaved(logins.length);
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
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-start)] border border-theme p-5 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-lotus-400" />
              بيانات دخول الروابط — {user.name}
            </h3>
            <p className="text-xs text-muted mt-1">
              اختار الشركة واكتب اليوزر والباسورد بس — الرابط بيتاخد من بيانات الشركة لوحده. الفرع بيشوفها ثابتة ومايقدرش يعدّل فيها.
            </p>
          </div>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {rows === null ? (
          <p className="text-sm text-muted text-center py-6">{error || 'جاري التحميل...'}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addAllCompanies}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600"
              >
                <ListPlus className="w-4 h-4" />
                إضافة كل الشركات مرة واحدة
              </button>
              <button
                type="button"
                onClick={() => setRows([...rows, blank()])}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500/20 text-lotus-300 text-sm font-medium hover:bg-lotus-500/30"
              >
                <Plus className="w-4 h-4" />
                إضافة رابط واحد
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

            {rows.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">لسه مفيش بيانات — ابدأ بـ «إضافة كل الشركات مرة واحدة» واكتب اليوزر والباسورد قدام كل شركة.</p>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-[1.3fr_1fr_1fr_auto] gap-2 px-1 text-[11px] text-muted">
                  <span>الشركة / الرابط</span>
                  <span>اسم المستخدم</span>
                  <span>كلمة المرور</span>
                  <span className="w-16" />
                </div>
                {rows.map((r, i) => {
                  const co = byId[r.companyId];
                  const expanded = open[r.id] || !r.companyId;
                  return (
                    <div key={r.id} className={`rounded-xl border p-2 space-y-2 ${hasData(r) ? 'border-lotus-500/30 bg-lotus-500/5' : 'border-white/10'}`}>
                      <div className="grid sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-2 items-center">
                        <select
                          value={r.companyId}
                          onChange={(e) => update(i, { companyId: e.target.value })}
                          className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-primary focus:outline-none"
                        >
                          <option value="" className="text-black">
                            — رابط تاني (مش تبع شركة) —
                          </option>
                          {sorted.map((c) => (
                            <option key={c.id} value={c.id} className="text-black">
                              {c.nameAr}
                            </option>
                          ))}
                        </select>
                        <input dir="ltr" autoComplete="off" value={r.username} onChange={(e) => update(i, { username: e.target.value })} placeholder="اسم المستخدم" className={input} />
                        <input dir="ltr" autoComplete="off" value={r.password} onChange={(e) => update(i, { password: e.target.value })} placeholder="كلمة المرور" className={input} />
                        <div className="flex items-center justify-end gap-1 w-16">
                          {r.companyId && (
                            <button
                              type="button"
                              onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                              className="p-2 rounded-lg hover:bg-white/10"
                              title="اسم ورابط مختلف وملاحظة"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                          <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title="حذف">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="grid sm:grid-cols-3 gap-2">
                          <input
                            value={r.label}
                            onChange={(e) => update(i, { label: e.target.value })}
                            placeholder={co ? `الاسم الظاهر (${co.nameAr})` : 'الاسم الظاهر (مثلاً: يوداوي)'}
                            className={input}
                          />
                          <input dir="ltr" value={r.url} onChange={(e) => update(i, { url: e.target.value })} placeholder={co?.approvalPortal || 'الرابط'} className={input} />
                          <input value={r.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="ملاحظة (اختياري)" className={input} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted">الشركات اللي سايب يوزرها وباسوردها فاضيين مش هتتحفظ ومش هتظهر للفرع.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="sticky -bottom-5 -mx-5 -mb-5 px-5 py-3 bg-[var(--color-bg-start)] border-t border-theme flex items-center gap-2 justify-end">
              {dirty && <span className="text-xs text-amber-400 ml-auto">في تعديلات لسه ماتحفظتش</span>}
              <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-white/10 text-sm">
                إلغاء
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-lotus-500 text-white text-sm font-semibold disabled:opacity-50"
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

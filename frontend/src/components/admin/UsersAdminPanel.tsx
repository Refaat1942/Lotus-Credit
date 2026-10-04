import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Loader2, Pencil, Plus, Search, ShieldCheck, Store, Trash2, X } from 'lucide-react';
import type { Company } from '../../types';
import type { Account } from '../../utils/session';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'لوحة المتابعة والتقارير',
  companies: 'شركات التأمين (التعديل)',
  branding: 'الهوية والشعار',
  content: 'المحتوى والنصوص',
  documents: 'المستندات',
  backups: 'النسخ الاحتياطي',
};

const FEATURE_LABELS: Record<string, string> = {
  coach: 'المرشد التفاعلي',
  assistant: 'المساعد الذكي (الشات)',
};

interface Draft {
  id?: string;
  name: string;
  username: string;
  password: string;
  role: 'branch' | 'admin';
  active: boolean;
  allCompanies: boolean;
  companies: string[];
  sections: string[];
  features: string[];
}

const emptyDraft = (): Draft => ({
  name: '',
  username: '',
  password: '',
  role: 'branch',
  active: true,
  allCompanies: true,
  companies: [],
  sections: ['dashboard'],
  features: ['coach', 'assistant'],
});

export default function UsersAdminPanel({ adminToken, companies }: { adminToken: string; companies: Company[] }) {
  const [users, setUsers] = useState<Account[] | null>(null);
  const [requireLogin, setRequireLogin] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const auth = { Authorization: `Bearer ${adminToken}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const names = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.nameAr])), [companies]);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: auth });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
      setRequireLogin(!!data.settings.requireLogin);
    } catch {
      setError('تعذر تحميل المستخدمين');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRequireLogin = async () => {
    const next = !requireLogin;
    if (next && !users?.some((u) => u.active && u.role === 'branch')) {
      if (!confirm('مفيش ولا حساب فرع مفعّل — الصيدليات مش هتقدر تدخل التطبيق. متأكد؟')) return;
    }
    const res = await fetch('/api/admin/settings', { method: 'PUT', headers: json, body: JSON.stringify({ requireLogin: next }) });
    if (res.ok) setRequireLogin(next);
  };

  const setActive = async (u: Account, active: boolean) => {
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'PUT', headers: json, body: JSON.stringify({ active }) });
    if (res.ok) load();
  };

  const remove = async (u: Account) => {
    if (!confirm(`حذف الحساب «${u.name}» نهائياً؟`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', headers: auth });
    if (res.ok) load();
  };

  const edit = (u: Account) =>
    setDraft({
      id: u.id,
      name: u.name,
      username: u.username,
      password: '',
      role: u.role === 'admin' ? 'admin' : 'branch',
      active: u.active,
      allCompanies: u.companies === 'all',
      companies: u.companies === 'all' ? [] : u.companies,
      sections: u.sections || [],
      features: u.features || [],
    });

  const companiesSummary = (u: Account) =>
    u.companies === 'all'
      ? 'كل الشركات'
      : u.companies.length <= 3
        ? u.companies.map((id) => names[id] || id).join('، ') || 'ولا شركة'
        : `${u.companies.length} شركات`;

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">دخول الفروع</h2>
            <p className="text-xs text-muted mt-1 max-w-xl leading-relaxed">
              لما يكون إجباري، أي حد يفتح التطبيق لازم يدخل باسم فرع أو مستخدم، ويشوف بس الشركات المسموح له بيها،
              والتقارير تبيّن كل فرع عمل إيه. لما يكون مقفول، التطبيق مفتوح للكل زي دلوقتي.
            </p>
          </div>
          <button type="button" role="switch" aria-checked={requireLogin} onClick={toggleRequireLogin} className="flex items-center gap-3">
            <span className={`relative w-12 h-6 rounded-full transition-colors ${requireLogin ? 'bg-emerald-500' : 'bg-white/20'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${requireLogin ? 'right-0.5' : 'right-[26px]'}`} />
            </span>
            <span className={`text-sm font-medium ${requireLogin ? 'text-emerald-300' : 'text-muted'}`}>
              {requireLogin ? 'الدخول إجباري' : 'التطبيق مفتوح للكل'}
            </span>
          </button>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">المستخدمون والفروع</h2>
            <p className="text-xs text-muted mt-1">
              حساب المالك (admin) له كل الصلاحيات، وكلمة مروره من إعدادات السيرفر.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600"
          >
            <Plus className="w-4 h-4" />
            إضافة فرع أو مستخدم
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {users === null ? (
          <p className="text-sm text-muted py-6 text-center">جاري التحميل...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">لا توجد حسابات بعد — أضف أول فرع</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border border-white/10 ${u.active ? 'bg-white/5' : 'bg-white/[0.02] opacity-60'}`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-lotus-500/20 text-lotus-300'}`}
                >
                  {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                </span>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-sm">
                    {u.name} <span className="text-muted font-normal text-xs" dir="ltr">@{u.username}</span>
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {u.role === 'admin' ? 'مدير' : 'فرع'} · {companiesSummary(u)}
                    {u.role === 'admin' && u.sections.length > 0 && ` · ${u.sections.map((s) => SECTION_LABELS[s]).join('، ')}`}
                    {u.lastLoginAt && ` · آخر دخول ${new Date(u.lastLoginAt).toLocaleString('ar-EG')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActive(u, !u.active)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${u.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-muted'}`}
                    title={u.active ? 'اضغط للإيقاف' : 'اضغط للتفعيل'}
                  >
                    {u.active ? 'مفعّل' : 'موقوف'}
                  </button>
                  <button type="button" onClick={() => edit(u)} className="p-2 rounded-lg hover:bg-white/10" title="تعديل">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => remove(u)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft && (
        <UserForm
          draft={draft}
          companies={companies}
          onClose={() => setDraft(null)}
          onSave={async (d) => {
            const body = {
              name: d.name,
              username: d.username,
              role: d.role,
              active: d.active,
              companies: d.allCompanies ? 'all' : d.companies,
              sections: d.sections,
              features: d.features,
              ...(d.password ? { password: d.password } : {}),
            };
            const res = await fetch(d.id ? `/api/admin/users/${d.id}` : '/api/admin/users', {
              method: d.id ? 'PUT' : 'POST',
              headers: json,
              body: JSON.stringify(body),
            });
            if (!res.ok) return (await res.json().catch(() => ({}))).error || 'فشل الحفظ';
            setDraft(null);
            load();
            return null;
          }}
        />
      )}
    </div>
  );
}

function UserForm({
  draft: initial,
  companies,
  onClose,
  onSave,
}: {
  draft: Draft;
  companies: Company[];
  onClose: () => void;
  onSave: (d: Draft) => Promise<string | null>;
}) {
  const [d, setD] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggleIn = (k: 'companies' | 'sections' | 'features', v: string) =>
    setD((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));

  const sorted = [...companies].sort((a, b) => (a.order || 0) - (b.order || 0));
  const shown = sorted.filter((c) => !q.trim() || `${c.nameAr} ${c.nameEn}`.toLowerCase().includes(q.trim().toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.allCompanies && d.companies.length === 0) {
      setError('اختار شركة واحدة على الأقل أو «كل الشركات»');
      return;
    }
    setBusy(true);
    setError((await onSave(d)) || '');
    setBusy(false);
  };

  const input =
    'w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50';
  const chip = (on: boolean) =>
    `inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer select-none ${
      on ? 'border-lotus-500/50 bg-lotus-500/15 text-primary' : 'border-white/10 bg-white/5 text-muted'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-start)] border border-theme p-5 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{d.id ? `تعديل: ${initial.name}` : 'إضافة فرع أو مستخدم'}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['branch', 'admin'] as const).map((role) => (
            <label key={role} className={chip(d.role === role)}>
              <input type="radio" className="hidden" checked={d.role === role} onChange={() => set('role', role)} />
              {role === 'branch' ? <Store className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              <span>
                <span className="block font-medium">{role === 'branch' ? 'فرع / صيدلي' : 'مدير'}</span>
                <span className="block text-[11px] text-muted">{role === 'branch' ? 'يستخدم التطبيق' : 'يدخل لوحة الإدارة'}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">الاسم الظاهر</label>
            <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: فرع مدينة نصر" className={input} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">اسم الدخول</label>
            <input dir="ltr" value={d.username} onChange={(e) => set('username', e.target.value)} placeholder="nasr-city" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              {d.id ? 'كلمة مرور جديدة (اتركها فاضية لو مش هتغيّرها)' : 'كلمة المرور (4 حروف على الأقل)'}
            </label>
            <input type="text" dir="ltr" autoComplete="new-password" value={d.password} onChange={(e) => set('password', e.target.value)} className={input} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">الشركات اللي يشوفها</p>
          <div className="flex gap-2">
            <label className={chip(d.allCompanies)}>
              <input type="radio" className="hidden" checked={d.allCompanies} onChange={() => set('allCompanies', true)} />
              كل الشركات
            </label>
            <label className={chip(!d.allCompanies)}>
              <input type="radio" className="hidden" checked={!d.allCompanies} onChange={() => set('allCompanies', false)} />
              شركات محددة {!d.allCompanies && `(${d.companies.length})`}
            </label>
          </div>
          {!d.allCompanies && (
            <div className="rounded-xl border border-white/10 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className={`${input} pr-8`} />
                </div>
                <button type="button" onClick={() => set('companies', sorted.map((c) => c.id))} className="text-xs px-3 py-2 rounded-lg bg-white/10">
                  تحديد الكل
                </button>
                <button type="button" onClick={() => set('companies', [])} className="text-xs px-3 py-2 rounded-lg bg-white/10">
                  إلغاء الكل
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                {shown.map((c) => (
                  <label key={c.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${d.companies.includes(c.id) ? 'bg-lotus-500/15' : 'hover:bg-white/5'}`}>
                    <input type="checkbox" checked={d.companies.includes(c.id)} onChange={() => toggleIn('companies', c.id)} />
                    <span className="truncate">{c.nameAr}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {d.role === 'admin' && (
          <div className="space-y-2">
            <p className="text-sm font-medium">أقسام لوحة الإدارة المسموحة</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SECTION_LABELS).map(([k, label]) => (
                <label key={k} className={chip(d.sections.includes(k))}>
                  <input type="checkbox" className="hidden" checked={d.sections.includes(k)} onChange={() => toggleIn('sections', k)} />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted">إدارة المستخدمين والفروع للمالك بس.</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">في تطبيق الصيدلي</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FEATURE_LABELS).map(([k, label]) => (
              <label key={k} className={chip(d.features.includes(k))}>
                <input type="checkbox" className="hidden" checked={d.features.includes(k)} onChange={() => toggleIn('features', k)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} />
          الحساب مفعّل
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-sm">
            إلغاء
          </button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

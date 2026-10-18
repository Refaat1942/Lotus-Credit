import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Ban, Check, Loader2, Pencil, Search, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { deviceText } from '../../utils/device';
import { DeviceIcon } from './PendingDevicesAlert';
import {
  deleteDevice,
  fetchDevices,
  postJson,
  putSettings,
  updateDevice,
  when,
  ROLE_NAME,
  type DeviceRow,
  type DevicesData,
} from './devicesApi';

const STATUS: Record<DeviceRow['status'], { label: string; cls: string }> = {
  pending: { label: 'مستني موافقة', cls: 'bg-amber-500/15 text-amber-400' },
  approved: { label: 'معتمد', cls: 'bg-emerald-500/15 text-emerald-300' },
  blocked: { label: 'محظور', cls: 'bg-red-500/15 text-red-400' },
};

const FILTERS: { id: 'all' | DeviceRow['status']; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'مستني موافقة' },
  { id: 'approved', label: 'معتمد' },
  { id: 'blocked', label: 'محظور' },
];

function Switch({ on, onClick, labelOn, labelOff }: { on: boolean; onClick: () => void; labelOn: string; labelOff: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex items-center gap-3 shrink-0">
      <span className={`relative w-12 h-6 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'right-0.5' : 'right-[26px]'}`} />
      </span>
      <span className={`text-sm font-medium ${on ? 'text-emerald-300' : 'text-muted'}`}>{on ? labelOn : labelOff}</span>
    </button>
  );
}

/** Owner only: approve new devices, block or forget devices, and the Google Authenticator for the admin account. */
export default function DevicesSecurityPanel({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<DevicesData | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () =>
    fetchDevices(adminToken)
      .then(setData)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleApproval = async () => {
    if (!data) return;
    const next = !data.deviceApproval;
    if (
      next &&
      !confirm(
        'تفعيل موافقة الأجهزة:\n\n• الدخول هيبقى إجباري للكل.\n• أي حساب يدخل من جهاز جديد هيستنى موافقتك.\n• الحساب اللي لسه ماعندوش ولا جهاز معتمد، أول جهاز يدخل منه بيتعتمد لوحده.\n• الأجهزة اللي في القايمة دلوقتي بحالتها — راجعها واحظر أي جهاز مش تبعك.\n\nتفعيل؟',
      )
    )
      return;
    try {
      await putSettings(adminToken, { deviceApproval: next });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const act = async (d: DeviceRow, fn: () => Promise<void>) => {
    setBusyId(d.id);
    try {
      await fn();
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.devices || []).filter(
      (d) =>
        (filter === 'all' || d.status === filter) &&
        (!needle || `${d.account.name} ${d.account.username} ${d.label} ${deviceText(d)}`.toLowerCase().includes(needle)),
    );
  }, [data, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.devices.length || 0, pending: 0, approved: 0, blocked: 0 };
    for (const d of data?.devices || []) c[d.status] += 1;
    return c;
  }, [data]);

  if (!data) {
    return <p className="text-sm text-muted py-6 text-center">{error || 'جاري التحميل...'}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">موافقة الأجهزة الجديدة</h2>
            <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
              كل حساب يفتح من الأجهزة اللي إنت وافقت عليها بس. لو حد عرف اسم المستخدم وكلمة المرور وحاول يدخل من موبايله، هيظهر
              عندك في لوحة المتابعة «جهاز جديد عايز يدخل» ونوع الجهاز، ومش هيدخل غير لما توافق. (حساب المالك admin بيتحمي بـ
              Google Authenticator تحت.)
            </p>
          </div>
          <Switch on={data.deviceApproval} onClick={toggleApproval} labelOn="مفعّلة" labelOff="مقفولة" />
        </div>
      </div>

      <AuthenticatorCard adminToken={adminToken} enabled={data.totpEnabled} onChange={load} />

      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">الأجهزة ({counts.all})</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث باسم الفرع أو الجهاز..."
              className="w-full py-2 pr-8 pl-3 rounded-xl input-theme text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === f.id ? 'bg-lotus-500/25 text-lotus-300 border border-lotus-500/30' : 'glass hover:bg-white/10'
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {shown.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">
            {counts.all === 0 ? 'لسه مفيش أجهزة — كل جهاز بيتسجل هنا أول ما يدخل' : 'مفيش أجهزة بالفلتر ده'}
          </p>
        ) : (
          <div className="space-y-2">
            {shown.map((d) => {
              const isOwner = d.userId === 'owner';
              const busy = busyId === d.id;
              return (
                <div
                  key={d.id}
                  className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${
                    d.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'border-theme bg-surface'
                  } ${d.status === 'blocked' ? 'opacity-70' : ''}`}
                >
                  <span className="w-10 h-10 rounded-xl bg-lotus-500/15 text-lotus-500 flex items-center justify-center shrink-0">
                    <DeviceIcon kind={d.kind} />
                  </span>
                  <div className="flex-1 min-w-[220px] space-y-0.5">
                    <p className="text-sm font-medium text-primary flex flex-wrap items-center gap-2">
                      {d.label || deviceText(d)}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
                    </p>
                    {d.label && (
                      <p className="text-xs text-muted" dir="auto">
                        {deviceText(d)}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      الحساب: <span className="text-primary">{d.account.name}</span> ({ROLE_NAME[d.account.role] || d.account.role})
                      {d.account.username && (
                        <span dir="ltr" className="mx-1">
                          @{d.account.username}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted">
                      أول دخول {when(d.firstSeen)} · آخر ظهور {when(d.lastSeen)}
                      {d.ip ? ` · IP ${d.ip.replace(/^::ffff:/, '')}` : ''}
                      {d.screen ? ` · شاشة ${d.screen}` : ''}
                      {d.status === 'approved' && d.approvedBy ? ` · اتعتمد: ${d.approvedBy}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {d.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(d, () => updateDevice(adminToken, d.id, { status: 'approved' }))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                    )}
                    {d.status !== 'blocked' && !isOwner && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`حظر الجهاز ده؟ هيخرج فوراً ومش هيقدر يدخل حساب «${d.account.name}» تاني.`))
                            act(d, () => updateDevice(adminToken, d.id, { status: 'blocked' }));
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-500 text-xs font-medium disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        حظر
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      title="تسمية الجهاز (مثلاً: موبايل د. أحمد)"
                      onClick={() => {
                        const label = prompt('اسم للجهاز ده (مثلاً: كمبيوتر الكاشير):', d.label || '');
                        if (label !== null) act(d, () => updateDevice(adminToken, d.id, { label }));
                      }}
                      className="p-2 rounded-lg hover:bg-white/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="مسح من القايمة"
                      onClick={() => {
                        if (
                          confirm(
                            'مسح الجهاز من القايمة؟\nهيخرج من الحساب، ولو دخل تاني هيتعامل كجهاز جديد.\n(لو عايز تمنعه نهائياً استخدم «حظر»)',
                          )
                        )
                          act(d, () => deleteDevice(adminToken, d.id));
                      }}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted leading-relaxed">
          ملحوظة: المتصفحات مش بتسمح لأي موقع يقرأ الـ MAC Address، فكل متصفح بياخد بصمة سرية خاصة بيه أول مرة يدخل وبتتحفظ هنا.
          لو حد مسح بيانات المتصفح أو فتح من «التصفح الخفي» أو من متصفح تاني على نفس الجهاز، هيظهر كجهاز جديد ومحتاج موافقة.
        </p>
      </div>
    </div>
  );
}

function AuthenticatorCard({ adminToken, enabled, onChange }: { adminToken: string; enabled: boolean; onChange: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const { secret, uri } = await postJson<{ secret: string; uri: string }>(adminToken, '/api/admin/2fa/setup');
      setSetup({ secret, qr: await QRCode.toDataURL(uri, { width: 220, margin: 1 }) });
      setCode('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async (url: string) => {
    setBusy(true);
    setError('');
    try {
      await postJson(adminToken, url, { code });
      setSetup(null);
      setDisabling(false);
      setCode('');
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const codeField = (
    <input
      dir="ltr"
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="w-40 py-2 px-3 rounded-xl input-theme text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
    />
  );

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            Google Authenticator
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-muted'}`}
            >
              {enabled ? 'مفعّل' : 'مش مفعّل'}
            </span>
          </h2>
          <ul className="text-xs text-muted mt-2 space-y-1 leading-relaxed list-disc pr-4">
            <li>دخول حساب المالك (admin) هيطلب كلمة المرور + كود من 6 أرقام من موبايلك — حتى لو حد عرف كلمة المرور مش هيدخل.</li>
            <li>لما فرع يدخل من جهاز جديد، تقدر توافق من لوحة المتابعة، أو تقوله الكود اللي ظاهر عندك يكتبه فيتعتمد على طول.</li>
          </ul>
        </div>
        {!setup && !disabling && (
          <button
            type="button"
            disabled={busy}
            onClick={enabled ? () => setDisabling(true) : start}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 ${
              enabled ? 'bg-red-500/15 text-red-500' : 'bg-lotus-500 text-white hover:bg-lotus-600'
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {enabled ? 'إلغاء التفعيل' : 'تفعيل'}
          </button>
        )}
      </div>

      {setup && (
        <div className="rounded-xl border border-theme p-4 flex flex-wrap gap-5 items-start">
          <img src={setup.qr} alt="QR" className="w-[180px] h-[180px] rounded-lg bg-white p-1" />
          <div className="flex-1 min-w-[220px] space-y-3 text-sm">
            <ol className="list-decimal pr-4 space-y-1.5 text-muted text-xs leading-relaxed">
              <li>نزّل تطبيق «Google Authenticator» على موبايلك (Play Store / App Store).</li>
              <li>افتحه واضغط «+» ← «مسح رمز QR» وصوّر المربع ده.</li>
              <li>
                مش عارف تصوّر؟ اختار «إدخال مفتاح» واكتب:
                <span dir="ltr" className="block mt-1 font-mono text-primary select-all break-all">
                  {setup.secret}
                </span>
              </li>
              <li>اكتب الكود اللي ظهر في التطبيق هنا عشان نتأكد إنه شغال:</li>
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              {codeField}
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={() => confirmCode('/api/admin/2fa/enable')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد وتفعيل
              </button>
              <button type="button" onClick={() => setSetup(null)} className="px-3 py-2 rounded-xl bg-white/10 text-sm">
                إلغاء
              </button>
            </div>
            <p className="text-[11px] text-amber-400">
              مهم: لو الموبايل ضاع، السيرفر يقدر يلغي التفعيل بأمر واحد (موجود في ملف README).
            </p>
          </div>
        </div>
      )}

      {disabling && (
        <div className="rounded-xl border border-red-500/30 p-4 space-y-3">
          <p className="text-sm">عشان تلغي Google Authenticator اكتب الكود الحالي من التطبيق:</p>
          <div className="flex flex-wrap items-center gap-2">
            {codeField}
            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={() => confirmCode('/api/admin/2fa/disable')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              إلغاء التفعيل
            </button>
            <button type="button" onClick={() => setDisabling(false)} className="px-3 py-2 rounded-xl bg-white/10 text-sm">
              رجوع
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

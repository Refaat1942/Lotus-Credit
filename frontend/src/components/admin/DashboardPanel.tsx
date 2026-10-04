import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Download, Loader2, Search, Table2 } from 'lucide-react';

/** Single-series mark color: validated (lightness band, chroma, ≥3:1) on both the light and dark app surfaces. */
const SERIES = '#0d9488';

interface DailyRow {
  date: string;
  companyViews: number;
  coachStarts: number;
  assistantQuestions: number;
}
interface CompanyRow {
  companyId: string;
  name: string;
  views: number;
  coachStarts: number;
  coachFinishes: number;
}
interface UserRow {
  user: string;
  name: string;
  role: string;
  companyViews: number;
  coachStarts: number;
  coachFinishes: number;
  assistantQuestions: number;
  logins: number;
  lastSeen: string;
}
interface Report {
  range: { from: string; to: string };
  totals: {
    companyViews: number;
    coachStarts: number;
    coachFinishes: number;
    assistantQuestions: number;
    logins: number;
    failedLogins: number;
    activeUsers: number;
  };
  topCompanies: CompanyRow[];
  daily: DailyRow[];
  byUser: UserRow[];
}
interface LogEvent {
  t: string;
  type: string;
  user: string;
  userName: string;
  role: string;
  companyId?: string;
  companyName?: string;
  detail?: string;
}

export const EVENT_LABELS: Record<string, string> = {
  company_view: 'زيارة شركة',
  coach_start: 'بدء المرشد',
  coach_finish: 'إنهاء الصرف',
  assistant_question: 'سؤال للمساعد',
  login_ok: 'تسجيل دخول',
  login_fail: 'محاولة دخول فاشلة',
  admin_save: 'حفظ تعديلات',
  media_upload: 'رفع صورة',
  media_update: 'تعديل صورة',
  media_delete: 'حذف صورة',
  logo_upload: 'رفع شعار',
  backup_create: 'نسخة احتياطية',
  backup_restore: 'استرجاع نسخة',
  backup_delete: 'حذف نسخة',
  user_create: 'إضافة مستخدم',
  user_update: 'تعديل مستخدم',
  user_delete: 'حذف مستخدم',
  settings_update: 'تغيير الإعدادات',
};

const ROLE_LABELS: Record<string, string> = { owner: 'المالك', admin: 'مدير', branch: 'فرع', guest: 'زائر', unknown: '—' };

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDay(d);
};
const fmt = (n: number) => n.toLocaleString('en-US');
const tz = () => -new Date().getTimezoneOffset();

const PRESETS: { id: string; label: string; range: () => [string, string] }[] = [
  { id: 'today', label: 'اليوم', range: () => [daysAgo(0), daysAgo(0)] },
  { id: '7', label: 'آخر 7 أيام', range: () => [daysAgo(6), daysAgo(0)] },
  { id: '30', label: 'آخر 30 يوم', range: () => [daysAgo(29), daysAgo(0)] },
  {
    id: 'month',
    label: 'الشهر ده',
    range: () => {
      const d = new Date();
      return [localDay(new Date(d.getFullYear(), d.getMonth(), 1)), localDay(d)];
    },
  },
  { id: '90', label: 'آخر 90 يوم', range: () => [daysAgo(89), daysAgo(0)] },
];

export default function DashboardPanel({ adminToken }: { adminToken: string }) {
  const [preset, setPreset] = useState('7');
  const [[from, to], setRange] = useState<[string, string]>(PRESETS[1].range());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const auth = { Authorization: `Bearer ${adminToken}` };

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/reports?from=${from}&to=${to}&tz=${tz()}`, { headers: auth })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setReport)
      .catch(() => setError('تعذر تحميل التقرير'))
      .finally(() => setLoading(false));
  }, [from, to]);

  const t = report?.totals;
  const completion = t && t.coachStarts ? Math.round((t.coachFinishes / t.coachStarts) * 100) : null;

  return (
    <div className="space-y-4">
      {/* filters: one row above everything they scope */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange className="w-4 h-4 text-muted" />
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPreset(p.id);
              setRange(p.range());
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              preset === p.id ? 'bg-lotus-500/25 text-lotus-300 border border-lotus-500/30' : 'glass hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-muted mr-auto">
          من
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setPreset('custom');
              setRange([e.target.value || from, to]);
            }}
            className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 text-primary"
          />
          إلى
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setPreset('custom');
              setRange([from, e.target.value || to]);
            }}
            className="py-1 px-2 rounded-lg bg-white/5 border border-white/10 text-primary"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        </span>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {report && t && (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatTile label="زيارات الشركات" value={t.companyViews} />
            <StatTile label="بدء المرشد التفاعلي" value={t.coachStarts} />
            <StatTile label="صرف مكتمل بالمرشد" value={t.coachFinishes} note={completion !== null ? `${completion}% من اللي بدأوا` : undefined} />
            <StatTile label="أسئلة للمساعد الذكي" value={t.assistantQuestions} />
            <StatTile label="فروع ومستخدمين نشطين" value={t.activeUsers} />
            <StatTile label="تسجيلات دخول" value={t.logins} note={t.failedLogins ? `${t.failedLogins} محاولة فاشلة` : undefined} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <DailyChart rows={report.daily} />
            <TopCompanies rows={report.topCompanies} />
          </div>

          <UsersTable rows={report.byUser} />
        </div>
      )}

      <ActivityLog adminToken={adminToken} from={from} to={to} users={report?.byUser || []} />
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold text-primary mt-1">{fmt(value)}</p>
      {note && <p className="text-[11px] text-muted mt-0.5">{note}</p>}
    </div>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) || pow * 10;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Columns with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function DailyChart({ rows }: { rows: DailyRow[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const H = 220;
  const pad = { top: 22, right: 8, bottom: 26, left: 36 };
  const max = Math.max(0, ...rows.map((r) => r.companyViews));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;
  const slot = rows.length ? plotW / rows.length : 0;
  const colW = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(1, plotW / 52)));
  const peak = rows.reduce((best, r, i) => (r.companyViews > (rows[best]?.companyViews ?? -1) ? i : best), 0);
  const h = hover !== null ? rows[hover] : null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-sm">زيارات الشركات يومياً</h3>
          <p className="text-[11px] text-muted">مرّر على أي يوم لتفاصيله</p>
        </div>
        <button type="button" onClick={() => setAsTable(!asTable)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted" title={asTable ? 'عرض كرسم' : 'عرض كجدول'}>
          <Table2 className="w-4 h-4" />
        </button>
      </div>

      {asTable ? (
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-muted">
              <tr>
                <th className="text-right py-1">اليوم</th>
                <th className="text-right">زيارات</th>
                <th className="text-right">بدء المرشد</th>
                <th className="text-right">أسئلة المساعد</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.date} className="border-t border-white/5">
                  <td className="py-1" dir="ltr">{r.date}</td>
                  <td>{fmt(r.companyViews)}</td>
                  <td>{fmt(r.coachStarts)}</td>
                  <td>{fmt(r.assistantQuestions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" dir="ltr" onPointerLeave={() => setHover(null)}>
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label="زيارات الشركات يومياً">
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-slate-500/20" strokeWidth={1} />
                  <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fill="currentColor" className="text-muted" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(v)}
                  </text>
                </g>
              ))}
              {rows.map((r, i) => {
                const cx = pad.left + slot * i + slot / 2;
                const barH = (r.companyViews / top) * plotH;
                return (
                  <g key={r.date}>
                    {barH > 0 && (
                      <path d={columnPath(cx - colW / 2, y(r.companyViews), colW, barH)} fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.55} />
                    )}
                    {i === peak && r.companyViews > 0 && (
                      <text x={cx} y={y(r.companyViews) - 6} textAnchor="middle" fill="currentColor" className="text-primary" style={{ fontSize: 10, fontWeight: 600 }}>
                        {fmt(r.companyViews)}
                      </text>
                    )}
                    {i % labelEvery === 0 && (
                      <text x={cx} y={H - 8} textAnchor="middle" fill="currentColor" className="text-muted" style={{ fontSize: 10 }}>
                        {r.date.slice(8)}/{r.date.slice(5, 7)}
                      </text>
                    )}
                    {/* hit target: the whole slot, taller than the mark */}
                    <rect
                      x={pad.left + slot * i}
                      y={pad.top}
                      width={slot}
                      height={plotH}
                      fill="transparent"
                      tabIndex={0}
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                    />
                  </g>
                );
              })}
              <line x1={pad.left} x2={width - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="currentColor" className="text-slate-500/40" strokeWidth={1} />
            </svg>
          )}
          {h && hover !== null && (
            <div
              dir="rtl"
              className="absolute pointer-events-none z-10 rounded-lg border border-theme bg-[var(--color-bg-start)] px-3 py-2 text-xs shadow-xl"
              style={{
                top: 4,
                left: Math.min(Math.max(0, pad.left + slot * hover + slot / 2 - 70), Math.max(0, width - 150)),
                width: 150,
              }}
            >
              <p className="text-muted mb-1" dir="ltr">{h.date}</p>
              <TipRow value={h.companyViews} label="زيارات" keyed />
              <TipRow value={h.coachStarts} label="بدء المرشد" />
              <TipRow value={h.assistantQuestions} label="أسئلة المساعد" />
            </div>
          )}
          {max === 0 && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">لا توجد زيارات في الفترة دي</p>}
        </div>
      )}
    </div>
  );
}

function TipRow({ value, label, keyed }: { value: number; label: string; keyed?: boolean }) {
  return (
    <p className="flex items-center gap-2">
      {keyed ? <span className="w-3 h-0.5 rounded" style={{ background: SERIES }} /> : <span className="w-3" />}
      <span className="font-semibold text-primary tabular-nums">{fmt(value)}</span>
      <span className="text-muted">{label}</span>
    </p>
  );
}

function TopCompanies({ rows }: { rows: CompanyRow[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const top = rows.filter((r) => r.views > 0).slice(0, 10);
  const max = Math.max(1, ...top.map((r) => r.views));

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-sm">أكثر الشركات زيارة</h3>
          <p className="text-[11px] text-muted">أعلى 10 شركات بعدد الزيارات</p>
        </div>
        <button type="button" onClick={() => setAll(!all)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted" title={all ? 'عرض كرسم' : 'كل الشركات كجدول'}>
          <Table2 className="w-4 h-4" />
        </button>
      </div>

      {all ? (
        <div className="max-h-[220px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-muted">
              <tr>
                <th className="text-right py-1">الشركة</th>
                <th className="text-right">زيارات</th>
                <th className="text-right">بدء المرشد</th>
                <th className="text-right">صرف مكتمل</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.companyId} className="border-t border-white/5">
                  <td className="py-1">{r.name}</td>
                  <td>{fmt(r.views)}</td>
                  <td>{fmt(r.coachStarts)}</td>
                  <td>{fmt(r.coachFinishes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted text-center py-16">لا توجد زيارات في الفترة دي</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((r) => (
            <div
              key={r.companyId}
              tabIndex={0}
              onPointerEnter={() => setHover(r.companyId)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.companyId)}
              onBlur={() => setHover(null)}
              className="relative grid grid-cols-[110px_1fr] items-center gap-2 py-0.5 outline-none"
            >
              <span className="text-xs text-primary truncate" title={r.name}>
                {r.name}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-4 rounded-l"
                  style={{ width: `${(r.views / max) * 85}%`, background: SERIES, opacity: hover === null || hover === r.companyId ? 1 : 0.55 }}
                />
                <span className="text-xs font-semibold text-primary tabular-nums">{fmt(r.views)}</span>
              </span>
              {hover === r.companyId && (
                <div className="absolute left-0 -top-1 z-10 pointer-events-none rounded-lg border border-theme bg-[var(--color-bg-start)] px-3 py-2 text-xs shadow-xl w-[150px]">
                  <TipRow value={r.views} label="زيارات" keyed />
                  <TipRow value={r.coachStarts} label="بدء المرشد" />
                  <TipRow value={r.coachFinishes} label="صرف مكتمل" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTable({ rows }: { rows: UserRow[] }) {
  return (
    <div className="glass-card p-4">
      <h3 className="font-bold text-sm mb-3">نشاط الفروع والمستخدمين</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">لا يوجد نشاط في الفترة دي</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="text-muted">
              <tr>
                <th className="text-right py-1.5">الاسم</th>
                <th className="text-right">النوع</th>
                <th className="text-right">زيارات</th>
                <th className="text-right">بدء المرشد</th>
                <th className="text-right">صرف مكتمل</th>
                <th className="text-right">أسئلة المساعد</th>
                <th className="text-right">دخول</th>
                <th className="text-right">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.user} className="border-t border-white/5">
                  <td className="py-1.5 text-primary">{r.name}</td>
                  <td className="text-muted">{ROLE_LABELS[r.role] || r.role}</td>
                  <td>{fmt(r.companyViews)}</td>
                  <td>{fmt(r.coachStarts)}</td>
                  <td>{fmt(r.coachFinishes)}</td>
                  <td>{fmt(r.assistantQuestions)}</td>
                  <td>{fmt(r.logins)}</td>
                  <td className="text-muted">{new Date(r.lastSeen).toLocaleString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityLog({ adminToken, from, to, users }: { adminToken: string; from: string; to: string; users: UserRow[] }) {
  const [type, setType] = useState('');
  const [user, setUser] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const auth = { Authorization: `Bearer ${adminToken}` };

  const query = useMemo(() => {
    const p = new URLSearchParams({ from, to, tz: String(tz()) });
    if (type) p.set('type', type);
    if (user) p.set('user', user);
    if (q.trim()) p.set('q', q.trim());
    return p.toString();
  }, [from, to, type, user, q]);

  const load = async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logs?${query}&offset=${offset}&limit=100`, { headers: auth });
      const data = await res.json();
      setTotal(data.total);
      setItems((prev) => (offset ? [...prev, ...data.items] : data.items));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => load(0), 250);
    return () => clearTimeout(id);
  }, [query]);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/logs.csv?${query}`, { headers: auth });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `lotus-logs-${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const select = 'py-1.5 px-2 rounded-lg input-theme text-xs';

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold text-sm ml-2">سجل النشاط ({fmt(total)})</h3>
        <select value={type} onChange={(e) => setType(e.target.value)} className={select}>
          <option value="">كل الأنواع</option>
          {Object.entries(EVENT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select value={user} onChange={(e) => setUser(e.target.value)} className={select}>
          <option value="">كل المستخدمين</option>
          {users.map((u) => (
            <option key={u.user} value={u.user}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في السجل..." className="w-full py-1.5 pr-8 pl-2 rounded-lg bg-white/5 border border-white/10 text-xs" />
        </div>
        <button
          type="button"
          onClick={download}
          disabled={downloading || total === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs hover:bg-white/15 disabled:opacity-40"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          تنزيل Excel (CSV)
        </button>
      </div>

      <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <table className="w-full text-xs min-w-[640px]">
          <thead className="text-muted">
            <tr>
              <th className="text-right py-1.5">الوقت</th>
              <th className="text-right">النوع</th>
              <th className="text-right">المستخدم</th>
              <th className="text-right">الشركة</th>
              <th className="text-right">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={`${e.t}-${i}`} className="border-t border-white/5 align-top">
                <td className="py-1.5 text-muted whitespace-nowrap tabular-nums">{new Date(e.t).toLocaleString('ar-EG')}</td>
                <td className={`whitespace-nowrap ${e.type === 'login_fail' ? 'text-red-400' : 'text-primary'}`}>{EVENT_LABELS[e.type] || e.type}</td>
                <td className="whitespace-nowrap">
                  {e.userName} <span className="text-muted">({ROLE_LABELS[e.role] || e.role})</span>
                </td>
                <td className="whitespace-nowrap">{e.companyName || e.companyId || '—'}</td>
                <td className="text-muted max-w-[320px] break-words">{e.detail || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && <p className="text-sm text-muted text-center py-6">لا يوجد نشاط مطابق</p>}
      </div>

      {items.length < total && (
        <button type="button" onClick={() => load(items.length)} disabled={loading} className="w-full py-2 rounded-lg bg-white/5 text-xs hover:bg-white/10">
          عرض المزيد ({fmt(total - items.length)} متبقي)
        </button>
      )}
    </div>
  );
}

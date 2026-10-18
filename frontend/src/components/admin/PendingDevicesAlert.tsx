import { useEffect, useState } from 'react';
import { Ban, Check, Monitor, Smartphone, Tablet } from 'lucide-react';
import { deviceText } from '../../utils/device';
import { fetchDevices, updateDevice, when, ROLE_NAME, type DeviceRow } from './devicesApi';

export const DeviceIcon = ({ kind, className = 'w-5 h-5' }: { kind?: string; className?: string }) =>
  kind === 'موبايل' ? <Smartphone className={className} /> : kind === 'تابلت' ? <Tablet className={className} /> : <Monitor className={className} />;

/** Top of the owner's dashboard: new devices asking to sign in, with approve / block right there. */
export default function PendingDevicesAlert({ adminToken }: { adminToken: string }) {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [busyId, setBusyId] = useState('');

  const load = () =>
    fetchDevices(adminToken, true)
      .then((d) => setRows(d.devices))
      .catch(() => {});

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  const act = async (d: DeviceRow, status: 'approved' | 'blocked') => {
    if (status === 'blocked' && !confirm(`حظر الجهاز ده؟ مش هيقدر يدخل حساب «${d.account.name}» تاني.`)) return;
    setBusyId(d.id);
    try {
      await updateDevice(adminToken, d.id, { status });
      setRows((r) => r.filter((x) => x.id !== d.id));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyId('');
    }
  };

  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <p className="font-bold text-amber-400 flex items-center gap-2">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-amber-500" />
        </span>
        {rows.length === 1 ? 'جهاز جديد عايز يدخل' : `${rows.length} أجهزة جديدة عايزة تدخل`}
      </p>
      <div className="space-y-2">
        {rows.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface border border-theme p-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <DeviceIcon kind={d.kind} />
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-primary">
                {d.account.name} <span className="text-muted text-xs">({ROLE_NAME[d.account.role] || d.account.role})</span>
              </p>
              <p className="text-xs text-muted" dir="auto">
                {deviceText(d)}
              </p>
              <p className="text-[11px] text-muted">
                طلب الدخول {when(d.lastSeen)}
                {d.ip ? ` · IP ${d.ip.replace(/^::ffff:/, '')}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => act(d, 'approved')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                موافقة
              </button>
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => act(d, 'blocked')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-500 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                رفض وحظر
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

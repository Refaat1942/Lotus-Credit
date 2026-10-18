import type { DeviceSummary } from '../../utils/device';

export interface DeviceRow extends DeviceSummary {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'blocked';
  label: string;
  screen?: string;
  ua?: string;
  ip?: string;
  firstSeen: string;
  lastSeen: string;
  approvedAt?: string;
  approvedBy?: string;
  account: { name: string; username: string; role: string };
}

export interface DevicesData {
  deviceApproval: boolean;
  requireLogin: boolean;
  totpEnabled: boolean;
  devices: DeviceRow[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const json = (token: string) => ({ ...auth(token), 'Content-Type': 'application/json' });

export async function fetchDevices(token: string, onlyPending = false): Promise<DevicesData> {
  const res = await fetch(`/api/admin/devices${onlyPending ? '?status=pending' : ''}`, { headers: auth(token) });
  if (!res.ok) throw new Error('تعذر تحميل الأجهزة');
  return res.json();
}

export async function updateDevice(token: string, id: string, body: { status?: 'approved' | 'blocked'; label?: string }) {
  const res = await fetch(`/api/admin/devices/${id}`, { method: 'PUT', headers: json(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'فشل الحفظ');
}

export async function deleteDevice(token: string, id: string) {
  const res = await fetch(`/api/admin/devices/${id}`, { method: 'DELETE', headers: auth(token) });
  if (!res.ok) throw new Error('فشل الحذف');
}

export async function postJson<T>(token: string, url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: json(token), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حصل خطأ');
  return data as T;
}

export async function putSettings(token: string, body: { requireLogin?: boolean; deviceApproval?: boolean }) {
  const res = await fetch('/api/admin/settings', { method: 'PUT', headers: json(token), body: JSON.stringify(body) });
  if (!res.ok) throw new Error('فشل الحفظ');
  return res.json() as Promise<{ requireLogin: boolean; deviceApproval: boolean }>;
}

export const ROLE_NAME: Record<string, string> = { owner: 'المالك', admin: 'مدير', branch: 'فرع' };

export const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

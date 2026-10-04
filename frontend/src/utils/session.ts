import { useEffect, useState } from 'react';

export type AccountRole = 'owner' | 'admin' | 'branch';

export interface Account {
  id: string;
  username: string;
  name: string;
  role: AccountRole;
  active: boolean;
  companies: 'all' | string[];
  sections: string[];
  features: string[];
  createdAt?: string;
  lastLoginAt?: string;
}

interface Session {
  token: string;
  user: Account;
}

const KEY = 'lotus-session';
const EVENT = 'lotus-session-change';

/** The pharmacist app's signed-in branch/user (kept across visits; the admin panel has its own login). */
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function authHeader(): Record<string, string> {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

export function useSession() {
  const [session, setState] = useState(getSession);
  useEffect(() => {
    const update = () => setState(getSession());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return session;
}

/** Guests (when login isn't required) can use everything; signed-in branches only what they're allowed. */
export function canUse(session: Session | null, feature: 'coach' | 'assistant'): boolean {
  if (!session) return true;
  return session.user.role === 'owner' || session.user.features.includes(feature);
}

export function track(type: 'company_view' | 'coach_start' | 'coach_finish', companyId?: string) {
  fetch('/api/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ type, companyId }),
  }).catch(() => {});
}

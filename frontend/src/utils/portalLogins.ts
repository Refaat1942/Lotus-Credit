import { useCallback, useEffect, useState } from 'react';
import { authHeader, useSession } from './session';

/** A company-portal username and password the owner saved for a branch account. */
export interface PortalLogin {
  id: string;
  companyId: string;
  label: string;
  url: string;
  username: string;
  password: string;
  note: string;
}

/** The signed-in branch's own portal logins (empty for guests); re-read whenever the page comes back into view. */
export function useMyLogins() {
  const session = useSession();
  const token = session?.token;
  const [logins, setLogins] = useState<PortalLogin[]>([]);

  const reload = useCallback(() => {
    if (!token) {
      setLogins([]);
      return;
    }
    fetch('/api/my/logins', { headers: authHeader(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setLogins(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    reload();
    window.addEventListener('focus', reload);
    const timer = setInterval(reload, 120000);
    return () => {
      window.removeEventListener('focus', reload);
      clearInterval(timer);
    };
  }, [reload]);

  return { logins, reload };
}

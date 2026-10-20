import { useEffect, useState } from 'react';
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

/** The signed-in branch's own portal logins (empty for guests). */
export function useMyLogins() {
  const session = useSession();
  const [logins, setLogins] = useState<PortalLogin[]>([]);
  useEffect(() => {
    if (!session) {
      setLogins([]);
      return;
    }
    fetch('/api/my/logins', { headers: authHeader(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogins)
      .catch(() => setLogins([]));
  }, [session?.token]);
  return logins;
}

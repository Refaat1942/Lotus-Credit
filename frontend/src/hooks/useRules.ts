import { useState, useEffect, useCallback } from 'react';
import type { RulesData } from '../types';
import { authHeader, getSession, setSession, useSession } from '../utils/session';

// One cache per account, so a branch never sees another account's companies offline.
const cacheKey = () => `lotus-credit-rules:${getSession()?.user.username ?? 'guest'}`;

export function useRules() {
  const session = useSession();
  const [data, setData] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rules', { headers: authHeader() });
      if (res.status === 401) {
        if (getSession()) setSession(null);
        setNeedsLogin(true);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error('Network error');
      const rules = (await res.json()) as RulesData;
      setNeedsLogin(false);
      setData(rules);
      try {
        localStorage.setItem(cacheKey(), JSON.stringify(rules));
      } catch {
        /* cache is optional */
      }
    } catch {
      try {
        const cached = localStorage.getItem(cacheKey());
        setData(cached ? (JSON.parse(cached) as RulesData) : null);
      } catch {
        setData(null);
      }
      setError('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules, session?.token]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      fetchRules();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRules]);

  return { data, loading, online, error, needsLogin, refetch: fetchRules };
}

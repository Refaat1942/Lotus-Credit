import { useState, useEffect, useCallback } from 'react';
import type { RulesData } from '../types';
import defaultRules from '../../../data/rules.json';

const CACHE_KEY = 'lotus-credit-rules';
const CACHE_TIME_KEY = 'lotus-credit-rules-time';
const CACHE_TTL = 1000 * 60 * 60;

export function useRules() {
  const [data, setData] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback((): RulesData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((rules: RulesData) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rules));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
  }, []);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rules');
      if (!res.ok) throw new Error('Network error');
      const rules = (await res.json()) as RulesData;
      setData(rules);
      saveToCache(rules);
    } catch {
      const cached = loadFromCache();
      if (cached) {
        setData(cached);
        setError('offline');
      } else {
        setData(defaultRules as RulesData);
        setError('fallback');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  useEffect(() => {
    fetchRules();
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

  return { data, loading, online, error, refetch: fetchRules };
}

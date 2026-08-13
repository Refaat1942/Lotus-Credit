import { useMemo } from 'react';
import { useRules } from './useRules';
import { DEFAULT_BRANDING, type Branding } from '../types';

export function useBranding(): Branding {
  const { data } = useRules();
  return useMemo(
    () => ({ ...DEFAULT_BRANDING, ...data?.branding }),
    [data?.branding]
  );
}

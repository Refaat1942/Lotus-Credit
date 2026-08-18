import { useMemo } from 'react';
import type { AppCopyBundle, GuideCopyBundle } from '../types';
import { mergeGuideCopy, mergeUiCopy, guideText, uiText } from '../utils/appCopy';

export function useAppCopy(uiOverride?: AppCopyBundle, guideOverride?: GuideCopyBundle) {
  const ui = useMemo(() => mergeUiCopy(uiOverride), [uiOverride]);
  const guide = useMemo(() => mergeGuideCopy(guideOverride), [guideOverride]);

  const u = (section: keyof AppCopyBundle, key: string, vars?: Record<string, string | number>) =>
    uiText(ui, section, key, vars);

  const g = (section: keyof GuideCopyBundle, key: string, vars?: Record<string, string | number>) =>
    guideText(guide, section, key, vars);

  return { ui, guide, u, g };
}

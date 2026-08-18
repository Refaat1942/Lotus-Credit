import type { AppCopyBundle, GuideCopyBundle } from '../types';
import { DEFAULT_GUIDE, DEFAULT_UI } from '../data/appDefaults';

function mergeSection<T extends Record<string, string>>(
  defaults: T,
  override?: Partial<T>,
): T {
  return { ...defaults, ...(override || {}) };
}

export function mergeUiCopy(ui?: AppCopyBundle): Required<AppCopyBundle> {
  return {
    home: mergeSection(DEFAULT_UI.home, ui?.home),
    header: mergeSection(DEFAULT_UI.header, ui?.header),
    company: mergeSection(DEFAULT_UI.company, ui?.company),
    card: mergeSection(DEFAULT_UI.card, ui?.card),
    quickRef: mergeSection(DEFAULT_UI.quickRef, ui?.quickRef),
    ruleLabels: mergeSection(DEFAULT_UI.ruleLabels, ui?.ruleLabels),
    assistant: mergeSection(DEFAULT_UI.assistant, ui?.assistant),
  };
}

export function mergeGuideCopy(guide?: GuideCopyBundle): Required<GuideCopyBundle> {
  return {
    phases: mergeSection(DEFAULT_GUIDE.phases, guide?.phases),
    start: mergeSection(DEFAULT_GUIDE.start, guide?.start),
    steps: mergeSection(DEFAULT_GUIDE.steps, guide?.steps),
    forms: mergeSection(DEFAULT_GUIDE.forms, guide?.forms),
    rules: mergeSection(DEFAULT_GUIDE.rules, guide?.rules),
    common: mergeSection(DEFAULT_GUIDE.common, guide?.common),
  };
}

export function interp(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function uiText(
  ui: Required<AppCopyBundle>,
  section: keyof AppCopyBundle,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const raw = ui[section][key as keyof typeof ui[typeof section]] ?? key;
  return interp(String(raw), vars);
}

export function guideText(
  guide: Required<GuideCopyBundle>,
  section: keyof GuideCopyBundle,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const raw = guide[section][key as keyof typeof guide[typeof section]] ?? key;
  return interp(String(raw), vars);
}

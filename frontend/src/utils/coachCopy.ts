import type { Lang, LocalizedString } from '../types';
import { DEFAULT_COACH, type CoachCopyBundle, type CoachSection } from '../data/coachDefaults';

function mergeSection(
  section: CoachSection,
  global?: CoachCopyBundle,
  company?: CoachCopyBundle,
): Record<string, LocalizedString> {
  const base = { ...DEFAULT_COACH[section] };
  for (const [key, val] of Object.entries(global?.[section] || {})) {
    if (val?.ar || val?.en) base[key] = { ...base[key], ...val };
  }
  for (const [key, val] of Object.entries(company?.[section] || {})) {
    if (val?.ar || val?.en) base[key] = { ...base[key], ...val };
  }
  return base;
}

export function mergeCoachCopy(global?: CoachCopyBundle, company?: CoachCopyBundle): Required<CoachCopyBundle> {
  return {
    messages: mergeSection('messages', global, company),
    buttons: mergeSection('buttons', global, company),
    checklist: mergeSection('checklist', global, company),
    ui: mergeSection('ui', global, company),
  };
}

export function pickLocalized(entry: LocalizedString | undefined, lang: Lang, fallback = ''): string {
  if (!entry) return fallback;
  return entry[lang] || entry.ar || entry.en || fallback;
}

export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function resolveCoachText(
  copy: Required<CoachCopyBundle>,
  section: CoachSection,
  key: string,
  lang: Lang,
  vars: Record<string, string> = {},
): string {
  const entry = copy[section][key];
  const raw = pickLocalized(entry, lang);
  return interpolate(raw, vars);
}

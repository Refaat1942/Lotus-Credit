import { useMemo } from 'react';
import type { Company, CoachCopyBundle } from '../types';
import { mergeCoachCopy, resolveCoachText } from '../utils/coachCopy';

export type ChecklistKey =
  | 'cardValid'
  | 'formComplete'
  | 'formCompleteGeneric'
  | 'signature'
  | 'stamp'
  | 'diagnosis'
  | 'copay'
  | 'quantities';

export function buildFinalChecklistKeys(company: Company): ChecklistKey[] {
  const r = company.rules;
  const keys: ChecklistKey[] = ['cardValid', 'formComplete'];
  if (r?.signatureRequired) keys.push('signature');
  if (r?.stampRequired) keys.push('stamp');
  if (r?.diagnosisRequired) keys.push('diagnosis');
  if (r?.copay) keys.push('copay');
  keys.push('quantities');
  return keys;
}

export function formHintKey(form: string): string | null {
  const n = form.toLowerCase();
  if (n.includes('أصفر') || n.includes('اصفر')) return 'formHintYellow';
  if (n.includes('أزرق') || n.includes('ازرق')) return 'formHintBlue';
  if (n.includes('e-form') || n.includes('yodawy') || n.includes('يوداوي')) return 'formHintEform';
  if (n.includes('خارج')) return 'formHintExternal';
  return null;
}

export function useCoachCopy(company: Company, globalCoach?: CoachCopyBundle) {
  const copy = useMemo(
    () => mergeCoachCopy(globalCoach, company.coachCopy),
    [globalCoach, company.coachCopy],
  );

  const baseVars = useMemo(() => ({ company: company.nameAr }), [company.nameAr]);

  const msg = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'messages', key, 'ar', { ...baseVars, ...vars });

  const btn = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'buttons', key, 'ar', { ...baseVars, ...vars });

  const checklist = (key: ChecklistKey, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'checklist', key, 'ar', vars);

  const ui = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'ui', key, 'ar', { ...baseVars, ...vars });

  const formLabel = (index: number): string => company.forms?.[index] || '';

  const formLabelByName = (form: string | null): string => {
    if (!form) return '';
    const idx = company.forms?.indexOf(form) ?? -1;
    if (idx >= 0) return formLabel(idx);
    return form;
  };

  return { msg, btn, checklist, ui, formLabel, formLabelByName };
}

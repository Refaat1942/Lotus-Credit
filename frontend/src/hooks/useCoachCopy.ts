import { useMemo } from 'react';
import type { Company } from '../types';
import type { CoachCopyBundle } from '../types';
import { useLanguage } from '../context/LanguageContext';
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
  const { lang } = useLanguage();
  const copy = useMemo(
    () => mergeCoachCopy(globalCoach, company.coachCopy),
    [globalCoach, company.coachCopy],
  );

  const companyName = lang === 'en' ? company.nameEn : company.nameAr;
  const baseVars = useMemo(() => ({ company: companyName }), [companyName]);

  const msg = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'messages', key, lang, { ...baseVars, ...vars });

  const btn = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'buttons', key, lang, { ...baseVars, ...vars });

  const checklist = (key: ChecklistKey, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'checklist', key, lang, vars);

  const ui = (key: string, vars: Record<string, string> = {}) =>
    resolveCoachText(copy, 'ui', key, lang, { ...baseVars, ...vars });

  const formLabel = (index: number): string => {
    const ar = company.forms?.[index] || '';
    const en = company.formsEn?.[index];
    return lang === 'en' ? (en || ar) : ar;
  };

  const formLabelByName = (form: string | null): string => {
    if (!form) return '';
    const idx = company.forms?.indexOf(form) ?? -1;
    if (idx >= 0) return formLabel(idx);
    return form;
  };

  return { lang, copy, msg, btn, checklist, ui, formLabel, formLabelByName, companyName };
}

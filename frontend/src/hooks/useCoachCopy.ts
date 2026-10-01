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

/** Final-checklist items an admin can switch on/off ('formComplete' covers both form wordings). */
export const CHECKLIST_ITEMS: ChecklistKey[] = ['cardValid', 'formComplete', 'signature', 'stamp', 'diagnosis', 'copay', 'quantities'];

export function checklistAuto(company: Company, key: ChecklistKey): boolean {
  const r = company.rules;
  if (key === 'signature') return !!r?.signatureRequired;
  if (key === 'stamp') return !!r?.stampRequired;
  if (key === 'diagnosis') return !!r?.diagnosisRequired;
  if (key === 'copay') return !!r?.copay;
  return true;
}

/** Items the pharmacist must tick: built-in ones that are on, then the admin's extra items as `extra:<n>`. */
export function buildFinalChecklistKeys(company: Company): string[] {
  const builtIn = CHECKLIST_ITEMS.filter((k) => company.coachChecklist?.[k] ?? checklistAuto(company, k));
  const extra = (company.coachChecklistExtra || []).map((t, i) => (t.trim() ? `extra:${i}` : '')).filter(Boolean);
  return [...builtIn, ...extra];
}

export function formHintKey(form: string): string | null {
  const n = form.toLowerCase();
  if (n.includes('أصفر') || n.includes('اصفر')) return 'formHintYellow';
  if (n.includes('أزرق') || n.includes('ازرق')) return 'formHintBlue';
  if (n.includes('e-form') || n.includes('yodawy') || n.includes('يوداوي')) return 'formHintEform';
  if (n.includes('خارج')) return 'formHintExternal';
  return null;
}

type MsgFn = (key: string, vars?: Record<string, string>) => string;

/** Points shown under "before closing the invoice": the admin's own list, or built from the rules. */
export function buildRulesTipBullets(company: Company, msg: MsgFn, form?: string | null): string[] {
  if (company.rulesTipBullets) return company.rulesTipBullets.map((b) => b.trim()).filter(Boolean);
  const rules = company.rules;
  const bullets: string[] = [];
  if (rules?.copay) bullets.push(msg('rulesCopay', { copay: rules.copay }));
  if (rules?.signatureRequired) bullets.push(msg('rulesSignature'));
  if (rules?.stampRequired) bullets.push(msg('rulesStamp'));
  if (rules?.diagnosisRequired) bullets.push(msg('rulesDiagnosis'));
  if (rules?.alternativesPolicy) bullets.push(msg('rulesAlternatives', { policy: rules.alternativesPolicy }));
  if (form) {
    const hintKey = formHintKey(form);
    if (hintKey) bullets.push(msg(hintKey));
  }
  if (rules?.importantNotes?.length) bullets.push(...rules.importantNotes.slice(0, 2));
  return bullets;
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

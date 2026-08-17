import type { CoachPhase, Company, CompanyMedia } from '../types';
import { pickApprovalMedia, pickMediaForForm } from './formMedia';

export const COACH_STEP_CONFIG: {
  id: CoachPhase;
  labelAr: string;
  hint: string;
  multi?: boolean;
}[] = [
  { id: 'card_check', labelAr: '① فحص الكارنية', hint: 'صورة الكارنية الإلكترونية' },
  { id: 'card_help', labelAr: '② مساعدة الكارنية', hint: 'عند وجود مشكلة في الكارنية' },
  { id: 'approval_portal', labelAr: '③ الموافقة / البوابة', hint: 'صورة الموافقة أو شاشة النظام', multi: true },
  { id: 'rules_tip', labelAr: '④ قبل إغلاق الفاتورة', hint: 'صورة مرجعية اختيارية' },
];

export function mediaByIds(media: CompanyMedia[], ids?: string | string[] | null): CompanyMedia[] {
  if (!ids) return [];
  const list = Array.isArray(ids) ? ids : [ids];
  return list.map((id) => media.find((m) => m.id === id)).filter(Boolean) as CompanyMedia[];
}

export function resolveStepMedia(
  phase: CoachPhase,
  media: CompanyMedia[],
  stepMediaMap?: Partial<Record<CoachPhase, string | string[]>>,
): CompanyMedia[] {
  const mapped = mediaByIds(media, stepMediaMap?.[phase]);
  if (mapped.length) return mapped;

  if (phase === 'card_help' || phase === 'card_check') {
    const card = media.find((m) => m.type === 'card');
    return card ? [card] : [];
  }
  if (phase === 'approval_portal' || phase === 'approval_check') {
    return pickApprovalMedia(media);
  }
  return [];
}

export function resolveFormDoc(
  form: string,
  media: CompanyMedia[],
  company: Pick<Company, 'formMediaMap'>,
): CompanyMedia | null {
  return pickMediaForForm(form, media, company.formMediaMap);
}

export function setStepMediaId(
  map: Partial<Record<CoachPhase, string | string[]>> | undefined,
  phase: CoachPhase,
  mediaId: string | null,
  multi?: boolean,
): Partial<Record<CoachPhase, string | string[]>> {
  const next = { ...(map || {}) };
  if (!mediaId) {
    delete next[phase];
    return next;
  }
  if (multi) {
    const cur = next[phase];
    const ids = Array.isArray(cur) ? cur : cur ? [cur] : [];
    if (!ids.includes(mediaId)) ids.push(mediaId);
    next[phase] = ids;
  } else {
    next[phase] = mediaId;
  }
  return next;
}

export function removeStepMediaId(
  map: Partial<Record<CoachPhase, string | string[]>> | undefined,
  phase: CoachPhase,
  mediaId: string,
): Partial<Record<CoachPhase, string | string[]>> {
  const next = { ...(map || {}) };
  const cur = next[phase];
  if (!cur) return next;
  if (Array.isArray(cur)) {
    const filtered = cur.filter((id) => id !== mediaId);
    if (filtered.length) next[phase] = filtered;
    else delete next[phase];
  } else if (cur === mediaId) {
    delete next[phase];
  }
  return next;
}

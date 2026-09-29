import type { CoachPhase, Company, CompanyMedia } from '../types';
import { pickApprovalMedia, pickMediaForForm } from './formMedia';

export const COACH_STEP_CONFIG: { id: CoachPhase; labelAr: string }[] = [
  { id: 'welcome', labelAr: 'الترحيب' },
  { id: 'card_check', labelAr: 'فحص الكارنية' },
  { id: 'card_help', labelAr: 'مشكلة الكارنية' },
  { id: 'approval_check', labelAr: 'سؤال الموافقة' },
  { id: 'approval_portal', labelAr: 'أخذ الموافقة' },
  { id: 'rules_tip', labelAr: 'قبل ما تقفل الفاتورة' },
  { id: 'prohibitions', labelAr: 'محظورات الصرف' },
  { id: 'final_checks', labelAr: 'التأكيد النهائي' },
  { id: 'done', labelAr: 'انتهاء الصرف' },
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
  // an explicit (even empty) list set by the admin always wins over the automatic pick
  if (stepMediaMap && phase in stepMediaMap) return mediaByIds(media, stepMediaMap[phase]);

  if (phase === 'card_help' || phase === 'card_check') {
    const card = media.find((m) => m.type === 'card');
    return card ? [card] : [];
  }
  if (phase === 'approval_portal' || phase === 'approval_check') {
    return pickApprovalMedia(media);
  }
  return [];
}

export const COACH_ANSWER_MEDIA_CONFIG: {
  key: string;
  labelAr: string;
  labelEn: string;
}[] = [
  { key: 'card_bad', labelAr: 'في مشكلة في الكارنية', labelEn: 'Card has a problem' },
  { key: 'no_card', labelAr: 'مفيش كارنية إلكترونية', labelEn: 'No e-card' },
  { key: 'need_approval', labelAr: 'محتاج موافقة', labelEn: 'Needs approval' },
  { key: 'approval_help', labelAr: 'محتاج مساعدة في الموافقة', labelEn: 'Needs approval help' },
];

export function resolveFormDoc(
  form: string,
  media: CompanyMedia[],
  company: Pick<Company, 'formMediaMap' | 'formMediaByIndex' | 'coachAnswerMedia'>,
  formIndex?: number,
): CompanyMedia | null {
  return pickMediaForForm(form, media, {
    formMediaMap: company.formMediaMap,
    formMediaByIndex: company.formMediaByIndex,
    formIndex,
    coachAnswerMedia: company.coachAnswerMedia,
  });
}

export function resolveAnswerMedia(
  answerKey: string,
  media: CompanyMedia[],
  coachAnswerMedia?: Record<string, string>,
): CompanyMedia[] {
  const id = coachAnswerMedia?.[answerKey];
  if (!id) return [];
  const item = media.find((m) => m.id === id);
  return item ? [item] : [];
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

/** Older data stored some step photos per answer button; they're shown with their step. */
export const LEGACY_ANSWER_KEYS: Partial<Record<CoachPhase, string[]>> = {
  card_help: ['card_bad', 'no_card'],
  approval_portal: ['need_approval', 'approval_help'],
};

/** Every photo the pharmacist sees on a coach step, in order. */
export function stepPhotos(company: Company, media: CompanyMedia[], phase: CoachPhase): CompanyMedia[] {
  const list = [
    ...(LEGACY_ANSWER_KEYS[phase] || []).flatMap((k) => resolveAnswerMedia(k, media, company.coachAnswerMedia)),
    ...resolveStepMedia(phase, media, company.stepMediaMap),
  ];
  return list.filter((m, i) => list.findIndex((x) => x.id === m.id) === i);
}

export function cleanBullet(text: string): string {
  return text.replace(/^\s*[-–•*]\s*/, '').trim();
}

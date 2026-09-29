import type { Company } from '../types';
import { COACH_ANSWER_MEDIA_CONFIG, COACH_STEP_CONFIG } from './coachSteps';

/** Human-readable list of every place a media id is currently assigned within a company. */
export function getMediaUsage(company: Company, mediaId: string): string[] {
  const usage: string[] = [];
  const forms = company.forms || [];
  const byIndex = company.formMediaByIndex || [];
  const byMap = company.formMediaMap || {};

  forms.forEach((label, i) => {
    const list = company.formMedia?.[label];
    if (list ? list.includes(mediaId) : byIndex[i] === mediaId || byMap[label] === mediaId) {
      usage.push(`نموذج: ${label}`);
    }
  });

  const stepMap = company.stepMediaMap || {};
  for (const step of COACH_STEP_CONFIG) {
    const val = stepMap[step.id];
    const ids = Array.isArray(val) ? val : val ? [val] : [];
    if (ids.includes(mediaId)) usage.push(`خطوة المرشد: ${step.labelAr}`);
  }

  const answerMap = company.coachAnswerMedia || {};
  for (const answer of COACH_ANSWER_MEDIA_CONFIG) {
    if (answerMap[answer.key] === mediaId) usage.push(`إجابة: ${answer.labelAr}`);
  }

  return usage;
}

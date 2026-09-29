import type { Company, GuideCopyBundle } from '../types';
import { cleanBullet } from './coachSteps';

type GuideText = (section: keyof GuideCopyBundle, key: string, vars?: Record<string, string | number>) => string;

export interface GuideStep {
  key: string;
  title: string;
  detail: string;
  tip?: string;
  formName?: string;
  points: string[];
  custom: boolean;
}

/** Numbered points shown under a step when the admin hasn't written their own. */
export function defaultGuidePoints(company: Company, key: string): string[] {
  const r = company.rules || {};
  if (key === 'card') return company.cardInstructions || [];
  if (key === 'approval') {
    return [r.priorApprovalRequired, r.approvalValidity && `صلاحية الموافقة: ${r.approvalValidity}`].filter(Boolean) as string[];
  }
  return [];
}

export function buildGuideSteps(company: Company, g: GuideText): GuideStep[] {
  const r = company.rules || {};
  const points = (key: string) => {
    const custom = company.guideStepPoints?.[key];
    return {
      points: (custom ?? defaultGuidePoints(company, key)).map(cleanBullet).filter(Boolean),
      custom: custom !== undefined,
    };
  };
  return [
    { key: 'card', title: g('steps', 'stepCardTitle'), detail: g('steps', 'stepCardDetail'), ...points('card') },
    ...(company.forms || []).map((f) => ({
      key: `form:${f}`,
      title: g('steps', 'stepFormTitle'),
      detail: f,
      formName: f,
      ...points(`form:${f}`),
    })),
    {
      key: 'approval',
      title: g('steps', 'stepApprovalTitle'),
      detail: g('steps', 'stepApprovalDetail', { system: company.approvalSystem || g('steps', 'defaultSystem') }),
      tip: company.approvalPortal ? g('steps', 'stepApprovalTip') : undefined,
      ...points('approval'),
    },
    {
      key: 'dispense',
      title: g('steps', 'stepDispenseTitle'),
      detail: g('steps', 'stepDispenseDetail'),
      tip: r.alternativesPolicy,
      ...points('dispense'),
    },
  ];
}

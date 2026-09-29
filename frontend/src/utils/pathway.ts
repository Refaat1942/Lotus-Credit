import type { Company, CompanyMedia, CompanyPathway, PathwayStep } from '../types';

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function isPathwayActive(company: Company): boolean {
  const p = company.pathway;
  return !!p?.enabled && p.steps.some((s) => s.id === p.startId);
}

export function emptyStep(title = 'خطوة جديدة'): PathwayStep {
  return { id: newId('step'), title, message: '', options: [] };
}

/** Starter pathway mirroring the standard coach, so admins edit instead of starting blank. */
export function defaultPathwayTemplate(company: Company): CompanyPathway {
  const ids = {
    card: newId('step'),
    cardHelp: newId('step'),
    form: newId('step'),
    approval: newId('step'),
    rules: newId('step'),
    done: newId('step'),
  };
  const opt = (label: string, next: string | null) => ({ id: newId('opt'), label, next });
  const r = company.rules || {};
  const ruleBullets = [
    r.copay && `نسبة التحمل: ${r.copay}`,
    r.signatureRequired && 'توقيع العميل مطلوب',
    r.stampRequired && 'ختم الطبيب مطلوب',
    r.diagnosisRequired && 'التشخيص مطلوب',
    ...(r.importantNotes || []).slice(0, 3),
  ].filter(Boolean) as string[];

  const steps: PathwayStep[] = [
    {
      id: ids.card,
      title: 'فحص الكارنية',
      message: 'اطلب الكارنية من العميل وتأكد إنها سارية.',
      options: [opt('الكارنية سليمة', ids.form), opt('في مشكلة في الكارنية', ids.cardHelp)],
    },
    {
      id: ids.cardHelp,
      title: 'مشكلة الكارنية',
      message: 'اتبع التعليمات دي لحل مشكلة الكارنية:',
      bullets: company.cardInstructions?.slice(0, 5),
      options: [opt('اتحلت', ids.form)],
    },
    {
      id: ids.form,
      title: 'نوع الروشتة',
      message: 'اختار نوع الروشتة / طريقة الصرف:',
      options: (company.forms?.length ? company.forms : ['روشتة عادية']).map((f) =>
        opt(f, company.approvalPortal || r.priorApprovalRequired ? ids.approval : ids.rules),
      ),
    },
    {
      id: ids.approval,
      title: 'الموافقة',
      message: `هل الأدوية محتاجة موافقة مسبقة؟${r.approvalValidity ? `\nصلاحية الموافقة: ${r.approvalValidity}` : ''}`,
      link: company.approvalPortal ? { label: 'فتح بوابة الموافقات', url: company.approvalPortal } : undefined,
      options: [opt('أخدت الموافقة', ids.rules), opt('مش محتاجة موافقة', ids.rules)],
    },
    {
      id: ids.rules,
      title: 'قبل الصرف',
      message: 'راجع النقاط دي قبل ما تقفل الفاتورة:',
      bullets: ruleBullets.length ? ruleBullets : undefined,
      options: [opt('تمام، راجعت كل حاجة', ids.done)],
    },
    {
      id: ids.done,
      title: 'تم',
      message: 'ممتاز — الصرف جاهز ✓',
      options: [],
    },
  ];
  return { enabled: false, startId: ids.card, steps };
}

export interface SimpleStep {
  id: string;
  text: string;
  mediaIds?: string[];
}

const NEXT_LABEL = 'التالي ←';

/** Steps in order when the pathway is a straight line (no branches); null otherwise. */
export function linearSteps(pathway: CompanyPathway): PathwayStep[] | null {
  const byId = new Map(pathway.steps.map((s) => [s.id, s]));
  const order: PathwayStep[] = [];
  const seen = new Set<string>();
  let cur = byId.get(pathway.startId);
  while (cur && !seen.has(cur.id)) {
    if (cur.options.length > 1 || cur.link?.url) return null;
    seen.add(cur.id);
    order.push(cur);
    const next = cur.options[0]?.next;
    cur = next ? byId.get(next) : undefined;
  }
  if (cur || order.length !== pathway.steps.length) return null;
  return order;
}

export function toSimpleSteps(steps: PathwayStep[]): SimpleStep[] {
  return steps.map((s) => ({
    id: s.id,
    text: [s.message, ...(s.bullets || []).filter((b) => b.trim()).map((b) => `• ${b}`)].filter(Boolean).join('\n'),
    mediaIds: s.mediaIds,
  }));
}

export function fromSimpleSteps(list: SimpleStep[], enabled: boolean): CompanyPathway {
  const steps: PathwayStep[] = list.map((s, i) => {
    const firstLine = s.text.split('\n')[0].trim();
    return {
      id: s.id,
      title: firstLine.length > 40 ? `${firstLine.slice(0, 38)}…` : firstLine || `خطوة ${i + 1}`,
      message: s.text,
      mediaIds: s.mediaIds?.length ? s.mediaIds : undefined,
      options: i < list.length - 1 ? [{ id: `${s.id}-next`, label: NEXT_LABEL, next: list[i + 1].id }] : [],
    };
  });
  return { enabled, startId: list[0]?.id ?? '', steps };
}

/** Starter list filled from the company's existing rules. */
export function simpleTemplate(company: Company): SimpleStep[] {
  const r = company.rules || {};
  const lines = (arr: (string | false | undefined | null)[]) => arr.filter(Boolean).join('\n');
  const texts = [
    lines(['اطلب الكارنية من العميل وتأكد إنها سارية.', ...(company.cardInstructions || []).slice(0, 3).map((t) => `• ${t}`)]),
    lines(['تأكد من نوع الروشتة:', ...(company.forms || []).map((f) => `• ${f}`)]),
    (company.approvalPortal || r.priorApprovalRequired) &&
      lines([
        'خد الموافقة المسبقة لو الأدوية محتاجة.',
        company.approvalPortal && `البوابة: ${company.approvalPortal}`,
        r.approvalValidity && `صلاحية الموافقة: ${r.approvalValidity}`,
      ]),
    lines([
      'راجع قبل ما تقفل الفاتورة:',
      r.copay && `• نسبة التحمل: ${r.copay}`,
      r.signatureRequired && '• توقيع العميل',
      r.stampRequired && '• ختم الطبيب',
      r.diagnosisRequired && '• التشخيص',
    ]),
  ].filter(Boolean) as string[];
  return texts.map((text) => ({ id: newId('step'), text }));
}

export function stepMedia(step: PathwayStep, media: CompanyMedia[]): CompanyMedia[] {
  return (step.mediaIds || [])
    .map((id) => media.find((m) => m.id === id))
    .filter(Boolean) as CompanyMedia[];
}

/** Remove a deleted media id from every place a company references it. */
export function stripMediaFromCompany(company: Company, mediaId: string): Company {
  const next: Company = { ...company, media: (company.media || []).filter((m) => m.id !== mediaId) };

  if (next.formMediaMap) {
    const map = Object.fromEntries(Object.entries(next.formMediaMap).filter(([, v]) => v !== mediaId));
    next.formMediaMap = Object.keys(map).length ? map : undefined;
  }
  if (next.formMediaByIndex) {
    const arr = next.formMediaByIndex.map((id) => (id === mediaId ? '' : id));
    next.formMediaByIndex = arr.some(Boolean) ? arr : undefined;
  }
  if (next.coachAnswerMedia) {
    const map = Object.fromEntries(Object.entries(next.coachAnswerMedia).filter(([, v]) => v !== mediaId));
    next.coachAnswerMedia = Object.keys(map).length ? map : undefined;
  }
  if (next.stepMediaMap) {
    const map: NonNullable<Company['stepMediaMap']> = {};
    for (const [k, v] of Object.entries(next.stepMediaMap)) {
      const ids = (Array.isArray(v) ? v : v ? [v] : []).filter((id) => id !== mediaId);
      if (ids.length) map[k as keyof typeof map] = Array.isArray(v) ? ids : ids[0];
    }
    next.stepMediaMap = Object.keys(map).length ? map : undefined;
  }
  if (next.pathway) {
    next.pathway = {
      ...next.pathway,
      steps: next.pathway.steps.map((s) =>
        s.mediaIds?.includes(mediaId) ? { ...s, mediaIds: s.mediaIds.filter((id) => id !== mediaId) } : s,
      ),
    };
  }
  return next;
}

export interface LayoutNode {
  step: PathwayStep;
  x: number;
  y: number;
  level: number;
  reachable: boolean;
}

export const NODE_W = 190;
export const NODE_H = 76;
const H_GAP = 60;
const V_GAP = 84;

/** Layered layout: BFS depth from the start step; unreachable steps go on a final row. */
export function layoutPathway(pathway: CompanyPathway): { nodes: LayoutNode[]; width: number; height: number } {
  const byId = new Map(pathway.steps.map((s) => [s.id, s]));
  const level = new Map<string, number>();
  const queue: string[] = [];
  if (byId.has(pathway.startId)) {
    level.set(pathway.startId, 0);
    queue.push(pathway.startId);
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const o of byId.get(id)!.options) {
      if (o.next && byId.has(o.next) && !level.has(o.next)) {
        level.set(o.next, level.get(id)! + 1);
        queue.push(o.next);
      }
    }
  }

  const rows: PathwayStep[][] = [];
  const orphans: PathwayStep[] = [];
  for (const s of pathway.steps) {
    const l = level.get(s.id);
    if (l === undefined) orphans.push(s);
    else (rows[l] ||= []).push(s);
  }
  if (orphans.length) rows.push(orphans);

  const maxCols = Math.max(1, ...rows.map((r) => r.length));
  const width = maxCols * NODE_W + (maxCols - 1) * H_GAP + 40;
  const nodes: LayoutNode[] = [];
  rows.forEach((row, li) => {
    const rowW = row.length * NODE_W + (row.length - 1) * H_GAP;
    const offset = (width - rowW) / 2;
    row.forEach((step, ci) => {
      nodes.push({
        step,
        // right-to-left so the first branch sits on the right, matching Arabic reading order
        x: width - offset - (ci + 1) * NODE_W - ci * H_GAP,
        y: 20 + li * (NODE_H + V_GAP),
        level: li,
        reachable: level.has(step.id),
      });
    });
  });
  const height = 40 + rows.length * NODE_H + Math.max(0, rows.length - 1) * V_GAP;
  return { nodes, width, height };
}

export function pathwayWarnings(pathway: CompanyPathway): string[] {
  const warnings: string[] = [];
  const ids = new Set(pathway.steps.map((s) => s.id));
  if (!ids.has(pathway.startId)) warnings.push('لم يتم تحديد خطوة البداية');
  const { nodes } = layoutPathway(pathway);
  const orphans = nodes.filter((n) => !n.reachable);
  if (orphans.length) {
    warnings.push(`خطوات لا يمكن الوصول إليها: ${orphans.map((n) => n.step.title || '—').join('، ')}`);
  }
  for (const s of pathway.steps) {
    if (!s.message.trim()) warnings.push(`الخطوة «${s.title || '—'}» بدون رسالة`);
    for (const o of s.options) {
      if (!o.label.trim()) warnings.push(`في الخطوة «${s.title || '—'}» زر بدون نص`);
      if (o.next && !ids.has(o.next)) warnings.push(`في الخطوة «${s.title || '—'}» زر يشير لخطوة محذوفة`);
    }
  }
  return warnings;
}

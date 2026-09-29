import type { Company } from '../types';

/** Remove a deleted media id from every place a company references it. */
export function stripMediaFromCompany(company: Company, mediaId: string): Company {
  const next: Company = { ...company, media: (company.media || []).filter((m) => m.id !== mediaId) };

  if (next.approvalSamples) {
    const ids = next.approvalSamples.filter((id) => id !== mediaId);
    next.approvalSamples = ids.length ? ids : undefined;
  }
  if (next.formMedia) {
    next.formMedia = Object.fromEntries(
      Object.entries(next.formMedia).map(([k, ids]) => [k, ids.filter((id) => id !== mediaId)]),
    );
  }
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
      // keep an explicit empty list: it means "no photos" rather than "use the automatic one"
      map[k as keyof typeof map] = Array.isArray(v) ? v.filter((id) => id !== mediaId) : v === mediaId ? [] : v;
    }
    next.stepMediaMap = map;
  }
  return next;
}

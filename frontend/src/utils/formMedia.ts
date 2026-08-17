import type { CompanyMedia } from '../types';

export function normalizeAr(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function formKeywords(form: string): string[] {
  const n = normalizeAr(form);
  const keys = [n];
  if (n.includes('أزرق') || n.includes('ازرق')) keys.push('أزرق', 'ازرق', 'blue');
  if (n.includes('أصفر') || n.includes('اصفر')) keys.push('أصفر', 'اصفر', 'yellow');
  if (n.includes('كربون')) keys.push('كربون', 'carbon');
  if (n.includes('روشت')) keys.push('روشت', 'روشتة');
  if (n.includes('e-form') || n.includes('eform')) keys.push('form', 'e-form', 'eform');
  if (n.includes('yodawy') || n.includes('yodawy') || n.includes('يواد') || n.includes('يوداو')) {
    keys.push('yodawy', 'يوادوي', 'يوداوي', 'e-form');
  }
  if (n.includes('موافق')) keys.push('موافق');
  if (n.includes('كارن')) keys.push('كارن', 'card');
  if (n.includes('one health') || n.includes('onehealth') || n.includes('وان هيلث') || n.includes('one')) {
    keys.push('one health', 'onehealth', 'وان هيلث', 'one');
  }
  if (n.includes('خارج')) keys.push('خارج', 'خارجية', 'external');
  if (n.includes('أبيض') || n.includes('ابيض')) keys.push('أبيض', 'ابيض', 'white');
  if (n.includes('مسجل')) keys.push('مسجل', 'برنامج');
  if (n.includes('مزمن') || n.includes('شهري')) keys.push('مزمن', 'شهري', 'chronic');
  if (n.includes('e-prescription') || n.includes('eprescription')) {
    keys.push('e-prescription', 'prescription', 'روشتة', 'إلكترون');
  }
  if (n.includes('sehaone')) keys.push('sehaone', 'seha');
  return keys;
}

function scoreTextMatch(form: string, text: string): number {
  const keys = formKeywords(form);
  const title = normalizeAr(text);
  let score = 0;
  for (const kw of keys) {
    const k = normalizeAr(kw);
    if (k.length >= 3 && title.includes(k)) score += 3;
  }
  return score;
}

export function scoreMediaForForm(form: string, item: CompanyMedia): number {
  if (item.matchedForm === form) return 1000;

  let score = 0;
  score += scoreTextMatch(form, item.title);
  if (item.type === 'form') score += 4;
  if (item.type === 'photo') score += 1;
  if (item.type === 'card') score -= 2;
  return score;
}

export function pickMediaForForm(
  form: string,
  media: CompanyMedia[],
  formMediaMap?: Record<string, string>,
): CompanyMedia | null {
  const mappedId = formMediaMap?.[form];
  if (mappedId) {
    const exact = media.find((m) => m.id === mappedId);
    if (exact) return exact;
  }

  const byMatch = media.find((m) => m.matchedForm === form);
  if (byMatch) return byMatch;

  const ranked = media
    .map((m) => ({ m, score: scoreMediaForForm(form, m) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.m ?? null;
}

export function pickApprovalMedia(media: CompanyMedia[]): CompanyMedia[] {
  return media.filter((m) => {
    const t = normalizeAr(m.title);
    return t.includes('موافق') || t.includes('yodawy') || t.includes('يوداوي');
  }).slice(0, 4);
}

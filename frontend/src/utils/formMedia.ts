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
  if (n.includes('روشت')) keys.push('روشت');
  if (n.includes('e-form') || n.includes('eform')) keys.push('form', 'e-form');
  if (n.includes('موافق')) keys.push('موافق');
  if (n.includes('كارن')) keys.push('كارن', 'card');
  if (n.includes('one health')) keys.push('one', 'health');
  if (n.includes('خارج')) keys.push('خارج');
  return keys;
}

export function scoreMediaForForm(form: string, item: CompanyMedia): number {
  const title = normalizeAr(item.title);
  let score = 0;
  for (const kw of formKeywords(form)) {
    if (title.includes(normalizeAr(kw))) score += 3;
  }
  if (item.type === 'card') score += 2;
  if (item.type === 'photo' && title.includes('نموذج')) score += 1;
  return score;
}

export function pickMediaForForm(form: string, media: CompanyMedia[]): CompanyMedia | null {
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

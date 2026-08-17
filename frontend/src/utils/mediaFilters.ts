import type { CompanyMedia } from '../types';

const TEMPLATE_SIZES = new Set([
  '318x285',
  '877x88',
  '1825x171',
  '301x109',
  '301x98',
  '301x60',
  '301x58',
  '301x269',
  '301x216',
  '300x168',
  '258x109',
  '360x88',
  '360x115',
  '360x228',
  '299x123',
  '242x244',
  '242x243',
  '243x244',
]);

export function isTemplateMedia(item: CompanyMedia): boolean {
  if (item.width && item.height) {
    const key = `${item.width}x${item.height}`;
    if (TEMPLATE_SIZES.has(key)) return true;
    const { width: w, height: h } = item;
    if (h <= 120 && w >= 500) return true;
    if (h <= 180 && w >= 900) return true;
    if (w >= 900 && h >= 200 && h <= 280) return true;
    if (w >= 500 && h >= 260 && h <= 280) return true;
  }
  return false;
}

export function galleryMedia(media: CompanyMedia[] = []): CompanyMedia[] {
  return media.filter((m) => !isTemplateMedia(m));
}

export function galleryMediaCount(media: CompanyMedia[] = []): number {
  return galleryMedia(media).length;
}

/** Images suitable for admin form/card picker — excludes long rule-text blobs from PPTX */
export function pickableCoachMedia(media: CompanyMedia[] = []): CompanyMedia[] {
  return galleryMedia(media).filter((m) => {
    if (m.page === 0 || m.id.includes('-coach-')) return true;
    if (m.type === 'form' || m.type === 'card') return true;
    if (m.matchedForm) return true;
    const t = m.title.trim();
    if (t.length > 72) return false;
    if (/^\d+-/.test(t) && t.length > 50) return false;
    if (/يلزم|يجب|عند الادخال|من الممكن|لا يتعدى|out of network/i.test(t) && t.length > 40) {
      return false;
    }
    return m.type === 'photo';
  });
}

export function mediaPickerLabel(m: CompanyMedia, fallbackIndex = 0): string {
  if (m.matchedForm) return m.matchedForm.length > 42 ? `${m.matchedForm.slice(0, 40)}…` : m.matchedForm;
  if (m.page === 0 || m.id.includes('-coach-')) {
    const t = m.title.trim();
    return t.length > 42 ? `${t.slice(0, 40)}…` : (t || 'مرفوعة من الجهاز');
  }
  if (m.type === 'card') return 'كارنية';
  if (m.type === 'form') {
    const t = m.title.trim();
    return t.length > 42 ? `${t.slice(0, 40)}…` : t;
  }
  const t = m.title.trim();
  if (t.startsWith('صفحة')) return t.length > 42 ? `${t.slice(0, 40)}…` : t;
  if (t.length <= 42) return t;
  return `ص${m.page} · ${fallbackIndex + 1}`;
}

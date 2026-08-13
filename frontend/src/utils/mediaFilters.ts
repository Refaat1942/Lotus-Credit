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

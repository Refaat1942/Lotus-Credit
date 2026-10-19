/**
 * Turns a link as the admin typed it into one the browser opens correctly:
 * "drive.google.com/..." without https:// would otherwise open as a page inside this app.
 */
export function linkHref(raw: string | undefined, type?: string): string {
  const url = String(raw || '').trim();
  if (!url) return '';
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(url)) return ''; // javascript:, data: ... never become links
  if (type === 'phone' || /^\+?[\d\s-]{5,}$/.test(url)) return `tel:${url.replace(/[\s-]/g, '')}`;
  if (type === 'email' || /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://${url.replace(/^\/+/, '')}`;
}

/** Web pages open in a new tab; phone and e-mail links don't. */
export const opensInNewTab = (href: string) => /^https?:/i.test(href);

const LINK_IN_TEXT = /(https?:\/\/\S+|www\.\S+|[^\s@:|]+@[^\s@|]+\.[a-z]{2,}|[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*)/i;
const TYPE_WORDS = ['portal', 'email', 'phone', 'website'];

const friendlyName = (href: string) =>
  /drive\.google\./i.test(href) ? 'Google Drive' : /youtu\.?be/i.test(href) ? 'YouTube' : href.startsWith('mailto:') ? 'بريد' : 'فتح الرابط';

/**
 * What a saved link really points to. Older lines were sometimes saved with the address in the title
 * (no | separator) or with a type word in the link box; the address is then taken from the title.
 */
export function resolveLink(link: { label: string; url: string; type: string }) {
  let url = String(link.url || '').trim();
  let label = String(link.label || '').trim();
  let type = link.type;
  if (TYPE_WORDS.includes(url.toLowerCase())) {
    type = url.toLowerCase();
    url = '';
  }
  if (!url) {
    const m = label.match(LINK_IN_TEXT);
    if (m) {
      url = m[0];
      label = label.replace(m[0], '').replace(/[\s:|،,-]+$/, '').trim();
      if (url.includes('@') && !url.includes('/')) type = 'email';
    }
  }
  const href = linkHref(url, type);
  return { href, type, label: label || (href ? friendlyName(href) : 'رابط'), text: url };
}

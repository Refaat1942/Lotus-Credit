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

/** One admin line "title | link | type"; a line with just a title and a link (no |) still works. */
export function splitLinkLine(line: string): [string, string, string] {
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length > 1) return [parts[0], parts[1] || '', parts[2] || ''];
  const m = line.match(/(https?:\/\/\S+|www\.\S+|[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*)/i);
  if (!m) return [line.trim(), '', ''];
  return [line.replace(m[0], '').trim(), m[0], ''];
}

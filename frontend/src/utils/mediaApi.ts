import type { CompanyMedia } from '../types';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** File-picker filter: every picture format (including ones some systems don't label as images). */
export const IMAGE_ACCEPT = 'image/*,.heic,.heif,.avif,.svg,.ico,.bmp,.tif,.tiff,.gif,.webp,.jfif';

const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
const dataUrlBytes = (url: string) => Math.floor((url.length - url.indexOf(',') - 1) * 0.75);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

/**
 * Turns any picture the browser can open into an upload-ready image.
 * Normal-size PNG/JPG/WebP/GIF go up untouched; anything else (BMP, TIFF, AVIF, ICO, HEIC where the
 * browser supports it, or a huge photo) is redrawn, shrunk to `maxSide` and saved as WebP (keeps transparency).
 */
export async function prepareImage(
  file: File,
  { maxSide, maxBytes, keepSvg = false }: { maxSide: number; maxBytes: number; keepSvg?: boolean },
): Promise<string> {
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name}: الملف أكبر من 40MB`);
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (isSvg && keepSvg) {
    if (file.size > maxBytes) throw new Error(`${file.name}: ملف SVG كبير جداً`);
    const text = await file.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(
      `${file.name}: المتصفح ده مش بيفتح الصيغة دي (زي HEIC من الآيفون على الكمبيوتر) — افتحها واحفظها JPG أو PNG، أو ارفعها من الموبايل`,
    );
  }
  const w = img.naturalWidth || maxSide;
  const h = img.naturalHeight || maxSide;
  if (/^image\/(png|jpeg|webp|gif)$/.test(file.type) && Math.max(w, h) <= maxSide && file.size <= maxBytes) {
    return readAsDataUrl(file);
  }

  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.92, 0.85, 0.75, 0.6, 0.45]) {
    const out = canvas.toDataURL('image/webp', quality);
    if (dataUrlBytes(out) <= maxBytes) return out;
  }
  throw new Error(`${file.name}: الصورة كبيرة جداً حتى بعد التصغير`);
}

const PHOTO = { maxSide: 2600, maxBytes: MAX_IMAGE_BYTES };
export const preparePhoto = (file: File) => prepareImage(file, PHOTO);
export const prepareLogo = (file: File) => prepareImage(file, { maxSide: 1024, maxBytes: 2 * 1024 * 1024, keepSvg: true });

function authJson(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function uploadCompanyMedia(companyId: string, token: string, file: File, title?: string): Promise<CompanyMedia> {
  const dataUrl = await prepareImage(file, PHOTO);
  const res = await fetch(`/api/admin/companies/${companyId}/media`, {
    method: 'POST',
    headers: authJson(token),
    body: JSON.stringify({ dataUrl, title: title ?? file.name.replace(/\.[^.]+$/, '') }),
  });
  if (!res.ok) throw new Error(`${file.name}: فشل الرفع`);
  return (await res.json()).media as CompanyMedia;
}

/** Uploads files one at a time (keeps each request under the server body limit). */
export async function uploadManyCompanyMedia(
  companyId: string,
  token: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ items: CompanyMedia[]; errors: string[] }> {
  const items: CompanyMedia[] = [];
  const errors: string[] = [];
  let done = 0;
  onProgress?.(0, files.length);
  for (const file of files) {
    try {
      items.push(await uploadCompanyMedia(companyId, token, file));
    } catch (e) {
      errors.push((e as Error).message);
    }
    onProgress?.(++done, files.length);
  }
  return { items, errors };
}

export async function updateCompanyMedia(
  companyId: string,
  token: string,
  mediaId: string,
  body: { title?: string; dataUrl?: string },
): Promise<CompanyMedia> {
  const res = await fetch(`/api/admin/companies/${companyId}/media/${mediaId}`, {
    method: 'PUT',
    headers: authJson(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('update failed');
  return (await res.json()).media as CompanyMedia;
}

export async function deleteCompanyMedia(companyId: string, token: string, mediaId: string): Promise<void> {
  const res = await fetch(`/api/admin/companies/${companyId}/media/${mediaId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) throw new Error('delete failed');
}

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

export function validateImage(file: File): string | null {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return `${file.name}: النوع غير مدعوم (PNG / JPG / WebP فقط)`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: الحجم أكبر من 3MB`;
  return null;
}

function authJson(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function uploadCompanyMedia(companyId: string, token: string, file: File, title?: string): Promise<CompanyMedia> {
  const dataUrl = await readAsDataUrl(file);
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
    const invalid = validateImage(file);
    if (invalid) errors.push(invalid);
    else {
      try {
        items.push(await uploadCompanyMedia(companyId, token, file));
      } catch (e) {
        errors.push((e as Error).message);
      }
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

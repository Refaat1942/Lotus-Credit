import type { Company } from '../types';
import { COACH_STEP_CONFIG, resolveFormDocs, stepPhotos } from './coachSteps';
import { galleryMedia } from './mediaFilters';

/** Every place a photo actually appears for the pharmacist, including photos the coach picks automatically. */
export function getMediaUsage(company: Company, mediaId: string): string[] {
  const media = galleryMedia(company.media || []);
  const usage: string[] = [];

  COACH_STEP_CONFIG.forEach((step, i) => {
    const label = `المرشد — خطوة ${i + 1}: ${step.labelAr}`;
    if (step.id === 'form_pick') {
      (company.forms || []).forEach((form, fi) => {
        if (resolveFormDocs(form, media, company, fi).some((m) => m.id === mediaId)) usage.push(`${label} (${form})`);
      });
    } else if (stepPhotos(company, media, step.id).some((m) => m.id === mediaId)) {
      usage.push(label);
    }
  });

  if (company.approvalSamples?.includes(mediaId)) usage.push('أشكال الموافقات');
  return usage;
}

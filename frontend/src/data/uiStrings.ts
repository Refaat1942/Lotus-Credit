import type { Lang, LocalizedString } from '../types';

export const UI_STRINGS: Record<string, LocalizedString> = {
  online: { ar: 'متصل', en: 'Online' },
  offline: { ar: 'أوفلاين', en: 'Offline' },
  refresh: { ar: 'تحديث', en: 'Refresh' },
  admin: { ar: 'إدارة', en: 'Admin' },
  themeLight: { ar: 'وضع فاتح', en: 'Light mode' },
  themeDark: { ar: 'وضع داكن', en: 'Dark mode' },
  langSwitch: { ar: 'EN', en: 'عربي' },
  searchPlaceholder: {
    ar: 'ابحث عن شركة تأمين، خط ساخن، أو نظام موافقات...',
    en: 'Search insurance company, hotline, or approval system...',
  },
  offlineCache: {
    ar: 'بيانات محفوظة محلياً — سيتم التحديث عند عودة الاتصال',
    en: 'Cached locally — will refresh when back online',
  },
  companiesHeading: { ar: 'شركات التأمين', en: 'Insurance companies' },
  companyCount: { ar: '{count} شركة', en: '{count} companies' },
  noSearchResults: { ar: 'لا توجد نتائج للبحث', en: 'No search results' },
  lastUpdated: { ar: 'آخر تحديث:', en: 'Last updated:' },
  backToCompanies: { ar: 'العودة لشركات التأمين', en: 'Back to insurance companies' },
  companyNotFound: { ar: 'الشركة غير موجودة', en: 'Company not found' },
  backHome: { ar: 'العودة للرئيسية', en: 'Back to home' },
};

export function uiText(key: string, lang: Lang, vars: Record<string, string> = {}): string {
  const entry = UI_STRINGS[key];
  const raw = entry?.[lang] || entry?.ar || key;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

export interface Contact {
  type: string;
  value: string;
}

export interface CompanyRules {
  prescriptionValidity?: string;
  maxDispensePeriod?: string;
  approvalValidity?: string;
  financialLimit?: string;
  priorApprovalRequired?: string;
  copay?: string;
  cardRequired?: boolean;
  signatureRequired?: boolean;
  stampRequired?: boolean;
  externalRxAllowed?: string;
  diagnosisRequired?: boolean;
  diagnosisHelp?: string;
  alternativesPolicy?: string;
  importantNotes?: string[];
  prohibitions?: string[];
}

export interface CompanyMedia {
  id: string;
  type: 'card' | 'photo';
  title: string;
  url: string;
  page: number;
  width?: number;
  height?: number;
}

export interface CompanyLink {
  id: string;
  label: string;
  url: string;
  type: 'portal' | 'email' | 'phone' | 'website';
  page?: number;
}

export interface Company {
  id: string;
  nameAr: string;
  nameEn: string;
  order: number;
  hotline?: string | null;
  approvalPortal?: string | null;
  approvalSystem?: string;
  color?: string;
  icon?: string;
  logoUrl?: string;
  contacts?: Contact[];
  forms?: string[];
  rules?: CompanyRules;
  cardInstructions?: string[];
  media?: CompanyMedia[];
  links?: CompanyLink[];
}

export interface Branding {
  logoUrl: string;
  titleAr: string;
  departmentAr: string;
  titleEn: string;
  subtitleAr: string;
  heroBadgeAr?: string;
  heroTitleAr: string;
  heroSubtitleAr: string;
  footerText: string;
}

export const DEFAULT_BRANDING: Branding = {
  logoUrl: '/lotus-logo.png',
  titleAr: 'صيدليات لوتس',
  departmentAr: 'قسم الاجل',
  titleEn: 'Lotus Credit',
  subtitleAr: 'شروط صرف التعاقدات',
  heroBadgeAr: 'قسم الاجل · شروط صرف التعاقدات',
  heroTitleAr: 'دليل صرف التعاقدات',
  heroSubtitleAr: 'كل ما تحتاجه لصرف روشتات التأمين بسرعة ودقة — بدون تسجيل دخول',
  footerText: '© 2026 Lotus Pharmacies',
};

export interface RulesData {
  version: string;
  branding?: Branding;
  meta: {
    titleAr: string;
    titleEn: string;
    organization: string;
    lastUpdated: string;
    sourceDocument: string;
  };
  general: {
    cardChecklist: string[];
    electronicCardRules: string[];
    approvalLinks: string[];
    lastUpdated: string;
    sourceDocument: string;
  };
  companies: Company[];
}

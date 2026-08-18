export interface Contact {
  type: string;
  value: string;
}

export type Lang = 'ar' | 'en';

export interface LocalizedString {
  ar: string;
  en: string;
}

export interface CoachCopyBundle {
  messages?: Record<string, LocalizedString>;
  buttons?: Record<string, LocalizedString>;
  checklist?: Record<string, LocalizedString>;
  ui?: Record<string, LocalizedString>;
}

export type StringCopySection = Record<string, string>;

export interface AppCopyBundle {
  home?: StringCopySection;
  header?: StringCopySection;
  company?: StringCopySection;
  card?: StringCopySection;
  quickRef?: StringCopySection;
  ruleLabels?: StringCopySection;
  assistant?: StringCopySection;
}

export interface GuideCopyBundle {
  phases?: StringCopySection;
  start?: StringCopySection;
  steps?: StringCopySection;
  forms?: StringCopySection;
  rules?: StringCopySection;
  common?: StringCopySection;
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
  type: 'card' | 'photo' | 'form';
  title: string;
  url: string;
  page: number;
  width?: number;
  height?: number;
  formTags?: string[];
  matchedForm?: string;
  links?: CompanyLink[];
}

export interface CompanyLink {
  id: string;
  label: string;
  url: string;
  type: 'portal' | 'email' | 'phone' | 'website';
  page?: number;
}

/** Interactive dispensing coach phases that can show images */
export type CoachPhase =
  | 'welcome'
  | 'card_check'
  | 'card_help'
  | 'form_pick'
  | 'form_doc'
  | 'approval_check'
  | 'approval_portal'
  | 'rules_tip'
  | 'final_checks'
  | 'done';

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
  /** English labels parallel to forms[] */
  formsEn?: string[];
  /** Admin-assigned: dispensing form label → media id */
  formMediaMap?: Record<string, string>;
  /** Admin-assigned: parallel to forms[] — media id per form choice (stable by index) */
  formMediaByIndex?: string[];
  /** Admin-assigned: coach answer key → media id (e.g. card_bad, no_card, need_approval) */
  coachAnswerMedia?: Record<string, string>;
  /** Per-company overrides for interactive coach copy */
  coachCopy?: CoachCopyBundle;
  /** Admin-assigned: coach step → media id(s) */
  stepMediaMap?: Partial<Record<CoachPhase, string | string[]>>;
  rules?: CompanyRules;
  cardInstructions?: string[];
  media?: CompanyMedia[];
  links?: CompanyLink[];
}

export interface Branding {
  logoUrl: string;
  titleAr: string;
  departmentAr: string;
  departmentEn?: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn?: string;
  heroBadgeAr?: string;
  heroBadgeEn?: string;
  heroTitleAr: string;
  heroTitleEn?: string;
  heroSubtitleAr: string;
  heroSubtitleEn?: string;
  footerText: string;
}

export const DEFAULT_BRANDING: Branding = {
  logoUrl: '/lotus-logo.png',
  titleAr: 'صيدليات لوتس',
  departmentAr: 'قسم الاجل',
  departmentEn: 'Credit Department',
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
  /** Global defaults/overrides for interactive coach copy */
  coach?: CoachCopyBundle;
  /** Global UI text overrides */
  ui?: AppCopyBundle;
  /** Dispensing guide text overrides */
  guide?: GuideCopyBundle;
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

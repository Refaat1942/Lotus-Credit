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
  contacts?: Contact[];
  forms?: string[];
  rules?: CompanyRules;
  cardInstructions?: string[];
}

export interface RulesData {
  version: string;
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

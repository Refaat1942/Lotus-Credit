import type { CoachCopyBundle, LocalizedString } from '../types';
import type { CopyFieldMeta } from './appDefaults';

export type CoachSection = 'messages' | 'buttons' | 'checklist' | 'ui';

export const DEFAULT_COACH: Required<CoachCopyBundle> = {
  messages: {
    welcome: {
      ar: 'أهلاً يا فندم! 👋\n\nأنا **مرشد الصرف** — هسألك شوية أسئلة وأوجّهك للخطوة والنموذج الصح.\n\nهنصرف على **{company}** — جاهز نبدأ؟',
      en: 'Hello! 👋\n\nI\'m your **Dispensing Coach** — I\'ll ask a few questions and guide you to the right step and form.\n\nWe\'re dispensing for **{company}** — ready to start?',
    },
    welcomeRestart: {
      ar: 'أهلاً تاني! 👋\n\nهنبدأ صرف جديد على **{company}** — جاهز؟',
      en: 'Welcome back! 👋\n\nStarting a new dispensing flow for **{company}** — ready?',
    },
    cardCheckIntro: {
      ar: '**أول خطوة: فحص الكارنية** 🪪\n\nهل الكارنية الإلكترونية **سارية** وتاريخها **النهاردة** (يوم الصرف)؟',
      en: '**Step 1: Check the card** 🪪\n\nIs the e-card **valid** with today\'s date (dispensing day)?',
    },
    formPickIntro: {
      ar: 'تمام! 👍\n\n**الخطوة التانية:** إيه نوع الروشتة أو النموذج اللي مع المريض؟\n\nاختار من الأزرار تحت — هورّيك النموذج المناسب من المستند.',
      en: 'Great! 👍\n\n**Step 2:** What prescription or form type does the patient have?\n\nPick a button below — I\'ll show the matching form from the document.',
    },
    formDocHasImage: {
      ar: 'ده **النموذج اللي هتستخدمه** — املأه حسب التعليمات:',
      en: 'This is **the form you\'ll use** — fill it according to the instructions:',
    },
    formDocNoImage: {
      ar: 'مفيش صورة مطابقة — راجع **تبويب النماذج** أو اطلب من المسؤول تعيين الصورة في لوحة الإدارة.',
      en: 'No matching image — check the **Forms tab** or ask an admin to assign the image in the admin panel.',
    },
    formDocValidity: {
      ar: '⏱ صلاحية الروشتة: **{validity}**',
      en: '⏱ Prescription validity: **{validity}**',
    },
    cardHelpNoCard: {
      ar: '⚠️ **الكارنية مطلوبة** لهذه الشركة. اتبع التعليمات:',
      en: '⚠️ **A card is required** for this company. Follow these instructions:',
    },
    cardHelpProblem: {
      ar: 'مفيش مشكلة — اتبع **التعليمات دي** وظبط الكارنية:',
      en: 'No problem — follow **these instructions** and fix the card:',
    },
    cardHelpDefault1: {
      ar: 'تأكد من صورة الكارنية من التطبيق وليس screenshot',
      en: 'Use the card image from the app, not a screenshot',
    },
    cardHelpDefault2: {
      ar: 'تأكد أن التاريخ = يوم الصرف',
      en: 'Ensure the date equals the dispensing day',
    },
    cardHelpDefaultNoCard: {
      ar: 'تأكد من بيانات العضوية قبل المتابعة',
      en: 'Verify membership details before continuing',
    },
    formUnsureList: {
      ar: '**الأنواع المتاحة لـ {company}:**\n\n{formsList}\n\nاسأل المريض عن نوع الروشتة واختار من الأزرار.',
      en: '**Available types for {company}:**\n\n{formsList}\n\nAsk the patient about the prescription type and pick a button.',
    },
    formUnsureEmpty: {
      ar: 'مفيش أنواع مسجلة — راجع المرجع أو اتصل بالخط الساخن.',
      en: 'No form types registered — check the reference guide or call the hotline.',
    },
    formAgain: {
      ar: 'تمام — **اختار نوع الروشتة** تاني:',
      en: 'OK — **pick the prescription type** again:',
    },
    approvalCheckIntro: {
      ar: '**الخطوة التالية: الموافقة**\n\nهل محتاج **موافقة** من **{system}** قبل الصرف؟',
      en: '**Next step: Approval**\n\nDo you need **approval** from **{system}** before dispensing?',
    },
    approvalNoWarning: {
      ar: '⚠️ **تنبيه:** {company} عادةً محتاجة موافقة.\n\n{note}\n\nلو متأكد إن الصرف مباشر، كمل — وإلا خُد موافقة.',
      en: '⚠️ **Note:** {company} usually requires approval.\n\n{note}\n\nIf you\'re sure it\'s direct dispensing, continue — otherwise get approval.',
    },
    approvalStep: {
      ar: '**خُد الموافقة** من **{system}**',
      en: '**Get approval** from **{system}**',
    },
    approvalStepValidity: {
      ar: '⏱ صلاحية الموافقة: **{validity}**',
      en: '⏱ Approval validity: **{validity}**',
    },
    approvalStepFooter: {
      ar: 'بعد ما تاخد الموافقة، اضغط **خُدت الموافقة ✓**',
      en: 'After you get approval, press **Got approval ✓**',
    },
    approvalHelpTitle: {
      ar: '**خطوات الموافقة:**',
      en: '**Approval steps:**',
    },
    approvalHelpPortal: {
      ar: 'افتح البوابة: {system}',
      en: 'Open the portal: {system}',
    },
    approvalHelpEnterMeds: {
      ar: 'أدخل كل الأدوية والجرعات والتشخيص',
      en: 'Enter all medicines, doses, and diagnosis',
    },
    approvalHelpValidity: {
      ar: 'الموافقة صالحة {validity}',
      en: 'Approval is valid for {validity}',
    },
    rulesTipTitle: {
      ar: '**قبل ما تقفل الفاتورة** — اتأكد من النقاط دي:',
      en: '**Before closing the invoice** — confirm these points:',
    },
    rulesTipEmpty: {
      ar: 'تمام! اتأكد إن كل البيانات مطابقة للموافقة.',
      en: 'Great! Make sure all data matches the approval.',
    },
    rulesCopay: {
      ar: 'التحمل: {copay}',
      en: 'Co-pay: {copay}',
    },
    rulesSignature: {
      ar: 'يلزم **توقيع العميل** على النموذج',
      en: '**Customer signature** is required on the form',
    },
    rulesStamp: {
      ar: 'يلزم **ختم الطبيب/المستشفى**',
      en: '**Doctor/hospital stamp** is required',
    },
    rulesDiagnosis: {
      ar: '**التشخيص** إلزامي في الموافقة',
      en: '**Diagnosis** is mandatory in the approval',
    },
    rulesAlternatives: {
      ar: 'البدائل: {policy}',
      en: 'Alternatives: {policy}',
    },
    formHintYellow: {
      ar: 'املأ **النموذج الأصفر بالكربون** بالكامل',
      en: 'Fill the **yellow carbon form** completely',
    },
    formHintBlue: {
      ar: 'استخدم **النموذج الأزرق** حسب تعليمات الشركة',
      en: 'Use the **blue form** per company instructions',
    },
    formHintEform: {
      ar: 'الصرف عبر **E-Form / يوداوي** — تاريخ البيع = تاريخ الموافقة',
      en: 'Dispense via **E-Form / Yodawy** — sale date = approval date',
    },
    formHintExternal: {
      ar: 'تأكد إن **الروشتة الخارجية** مسموحة على الكارنية',
      en: 'Ensure **external prescriptions** are allowed on the card',
    },
    finalChecksTitle: {
      ar: '**آخر خطوة:** علّم كل نقطة بعد ما تتأكد منها 👇',
      en: '**Final step:** Check each item after you confirm it 👇',
    },
    finishIncomplete: {
      ar: '⚠️ **لسه في نقاط ما اتعلمتش** — راجع القائمة وعلّم كل نقطة قبل الإغلاق.',
      en: '⚠️ **Some items are still unchecked** — review the list and check everything before closing.',
    },
    finishSuccess: {
      ar: 'تمام يا فندم! 🎉\n\n**الصرف على {company} اتعمل صح.**\n\nبالتوفيق — وأي استفسار اسأل **مساعد لوتس** 👇',
      en: 'All done! 🎉\n\n**Dispensing for {company} is complete.**\n\nGood luck — ask **Lotus assistant** if you need help 👇',
    },
  },
  buttons: {
    start: { ar: 'نعم، يلا نبدأ ✓', en: 'Yes, let\'s start ✓' },
    ref: { ar: 'عرض المرجع الكامل فقط', en: 'View full reference only' },
    cardOk: { ar: 'نعم، الكارنية تمام ✓', en: 'Yes, card is OK ✓' },
    cardBad: { ar: 'لا، في مشكلة في الكارنية', en: 'No, there\'s a card issue' },
    noCard: { ar: 'مفيش كارنية إلكترونية', en: 'No e-card available' },
    cardFixed: { ar: 'تمام، ظبطتها — كمل', en: 'Fixed — continue' },
    formUnsure: { ar: 'مش متأكد من النوع', en: 'Not sure of the type' },
    docOk: { ar: 'شفت النموذج — كمل ✓', en: 'Seen the form — continue ✓' },
    docZoom: { ar: 'عرض النموذج أكبر', en: 'View form larger' },
    formAgain: { ar: 'اختر نوع تاني', en: 'Pick another type' },
    needApproval: { ar: 'نعم، محتاج موافقة', en: 'Yes, approval needed' },
    noApproval: { ar: 'لا، صرف مباشر بدون موافقة', en: 'No, direct dispensing' },
    gotApproval: { ar: 'خُدت الموافقة ✓', en: 'Got approval ✓' },
    openPortal: { ar: 'افتح {system}', en: 'Open {system}' },
    approvalHelp: { ar: 'محتاج مساعدة في الموافقة', en: 'Need approval help' },
    rulesOk: { ar: 'فهمت — كمل ✓', en: 'Got it — continue ✓' },
    finish: { ar: 'خلصت الصرف ✓', en: 'Finished dispensing ✓' },
    restart: { ar: 'ابدأ صرف جديد', en: 'Start new dispensing' },
    home: { ar: 'العودة لشركات التأمين', en: 'Back to insurance companies' },
    call: { ar: 'اتصل {hotline}', en: 'Call {hotline}' },
  },
  checklist: {
    cardValid: { ar: 'الكارنية / العضوية سارية', en: 'Card / membership is valid' },
    formComplete: { ar: 'النموذج ({form}) مكتمل', en: 'Form ({form}) is complete' },
    formCompleteGeneric: { ar: 'النموذج مكتمل', en: 'Form is complete' },
    signature: { ar: 'توقيع العميل موجود', en: 'Customer signature present' },
    stamp: { ar: 'ختم الطبيب / المستشفى موجود', en: 'Doctor / hospital stamp present' },
    diagnosis: { ar: 'التشخيص مدخل في الموافقة', en: 'Diagnosis entered in approval' },
    copay: { ar: 'نسبة التحمل مطابقة للكارنية', en: 'Co-pay matches the card' },
    quantities: { ar: 'الكميات والجرعات مطابقة للموافقة', en: 'Quantities and doses match approval' },
  },
  ui: {
    coachTitle: { ar: 'مرشد الصرف — {company}', en: 'Dispensing Coach — {company}' },
    coachSubtitle: { ar: 'هوجّهك خطوة بخطوة زي زميل في الفرع', en: 'Step-by-step guidance like a colleague at the branch' },
    reference: { ar: 'المرجع', en: 'Reference' },
    phaseCard: { ar: 'كارنية', en: 'Card' },
    phaseForm: { ar: 'نموذج', en: 'Form' },
    phaseApproval: { ar: 'موافقة', en: 'Approval' },
    phaseConfirm: { ar: 'تأكيد', en: 'Confirm' },
    phaseDone: { ar: 'تم', en: 'Done' },
  },
};

export const COACH_SECTION_LABELS: Record<CoachSection, LocalizedString> = {
  messages: { ar: 'رسائل المرشد', en: 'Coach messages' },
  buttons: { ar: 'أزرار الإجابة', en: 'Answer buttons' },
  checklist: { ar: 'قائمة التأكيد', en: 'Final checklist' },
  ui: { ar: 'عناوين الواجهة', en: 'UI labels' },
};

const COACH_MESSAGES_LABELS: Record<string, CopyFieldMeta> = {
  welcome: { label: 'رسالة الترحيب', multiline: true },
  welcomeRestart: { label: 'إعادة الترحيب', multiline: true },
  cardCheckIntro: { label: 'سؤال فحص الكارنية', multiline: true },
  formPickIntro: { label: 'سؤال اختيار النموذج', multiline: true },
  formDocHasImage: { label: 'عند وجود صورة نموذج', multiline: true },
  formDocNoImage: { label: 'عند عدم وجود صورة', multiline: true },
  formDocValidity: { label: 'صلاحية الروشتة', hint: '{validity}' },
  cardHelpNoCard: { label: 'بدون كارنية', multiline: true },
  cardHelpProblem: { label: 'مشكلة في الكارنية', multiline: true },
  cardHelpDefault1: { label: 'تلميح كارنية 1' },
  cardHelpDefault2: { label: 'تلميح كارنية 2' },
  cardHelpDefaultNoCard: { label: 'تلميح بدون كارنية' },
  formUnsureList: { label: 'غير متأكد — قائمة الأنواع', multiline: true, hint: '{formsList}' },
  formUnsureEmpty: { label: 'غير متأكد — لا أنواع' },
  formAgain: { label: 'رسالة: اختيار نوع تاني', multiline: true },
  approvalCheckIntro: { label: 'سؤال الموافقة', multiline: true, hint: '{system}' },
  approvalNoWarning: { label: 'تحذير بدون موافقة', multiline: true },
  approvalStep: { label: 'خطوة الموافقة', hint: '{system}' },
  approvalStepValidity: { label: 'صلاحية الموافقة', hint: '{validity}' },
  approvalStepFooter: { label: 'بعد الموافقة' },
  approvalHelpTitle: { label: 'مساعدة الموافقة — عنوان' },
  approvalHelpPortal: { label: 'مساعدة — فتح البوابة', hint: '{system}' },
  approvalHelpEnterMeds: { label: 'مساعدة — إدخال الأدوية' },
  approvalHelpValidity: { label: 'مساعدة — صلاحية', hint: '{validity}' },
  rulesTipTitle: { label: 'قبل إغلاق الفاتورة' },
  rulesTipEmpty: { label: 'تلميح بدون نقاط' },
  rulesCopay: { label: 'نقطة: التحمل', hint: '{copay}' },
  rulesSignature: { label: 'نقطة: التوقيع' },
  rulesStamp: { label: 'نقطة: الختم' },
  rulesDiagnosis: { label: 'نقطة: التشخيص' },
  rulesAlternatives: { label: 'نقطة: البدائل', hint: '{policy}' },
  formHintYellow: { label: 'تلميح نموذج أصفر' },
  formHintBlue: { label: 'تلميح نموذج أزرق' },
  formHintEform: { label: 'تلميح E-Form' },
  formHintExternal: { label: 'تلميح روشتة خارجية' },
  finalChecksTitle: { label: 'قائمة التأكيد — عنوان' },
  finishIncomplete: { label: 'لم يكتمل التأكيد' },
  finishSuccess: { label: 'نجاح الصرف', multiline: true, hint: '{company}' },
};

const COACH_BUTTONS_LABELS: Record<string, CopyFieldMeta> = {
  start: { label: 'زر: ابدأ' },
  ref: { label: 'زر: المرجع الكامل' },
  cardOk: { label: 'زر: الكارنية تمام' },
  cardBad: { label: 'زر: مشكلة كارنية' },
  noCard: { label: 'زر: مفيش كارنية' },
  cardFixed: { label: 'زر: ظبطت الكارنية' },
  formUnsure: { label: 'زر: مش متأكد' },
  docOk: { label: 'زر: شفت النموذج' },
  docZoom: { label: 'زر: تكبير النموذج' },
  formAgain: { label: 'زر: نوع تاني' },
  needApproval: { label: 'زر: محتاج موافقة' },
  noApproval: { label: 'زر: صرف مباشر' },
  gotApproval: { label: 'زر: خُدت الموافقة' },
  openPortal: { label: 'زر: افتح البوابة', hint: '{system}' },
  approvalHelp: { label: 'زر: مساعدة موافقة' },
  rulesOk: { label: 'زر: فهمت' },
  finish: { label: 'زر: خلصت الصرف' },
  restart: { label: 'زر: صرف جديد' },
  home: { label: 'زر: العودة للشركات' },
  call: { label: 'زر: اتصل', hint: '{hotline}' },
};

const COACH_CHECKLIST_LABELS: Record<string, CopyFieldMeta> = {
  cardValid: { label: 'تأكيد: كارنية سارية' },
  formComplete: { label: 'تأكيد: النموذج مكتمل', hint: '{form}' },
  formCompleteGeneric: { label: 'تأكيد: نموذج (عام)' },
  signature: { label: 'تأكيد: التوقيع' },
  stamp: { label: 'تأكيد: الختم' },
  diagnosis: { label: 'تأكيد: التشخيص' },
  copay: { label: 'تأكيد: التحمل' },
  quantities: { label: 'تأكيد: الكميات' },
};

const COACH_UI_LABELS: Record<string, CopyFieldMeta> = {
  coachTitle: { label: 'عنوان المرشد', hint: '{company}' },
  coachSubtitle: { label: 'وصف المرشد' },
  reference: { label: 'زر المرجع' },
  phaseCard: { label: 'مرحلة: كارنية' },
  phaseForm: { label: 'مرحلة: نموذج' },
  phaseApproval: { label: 'مرحلة: موافقة' },
  phaseConfirm: { label: 'مرحلة: تأكيد' },
  phaseDone: { label: 'مرحلة: تم' },
};

export const COACH_FIELD_LABELS: Record<CoachSection, Record<string, CopyFieldMeta>> = {
  messages: Object.fromEntries(
    Object.keys(DEFAULT_COACH.messages).map((k) => [k, COACH_MESSAGES_LABELS[k] || { label: k }]),
  ),
  buttons: Object.fromEntries(
    Object.keys(DEFAULT_COACH.buttons).map((k) => [k, COACH_BUTTONS_LABELS[k] || { label: k }]),
  ),
  checklist: Object.fromEntries(
    Object.keys(DEFAULT_COACH.checklist).map((k) => [k, COACH_CHECKLIST_LABELS[k] || { label: k }]),
  ),
  ui: Object.fromEntries(
    Object.keys(DEFAULT_COACH.ui).map((k) => [k, COACH_UI_LABELS[k] || { label: k }]),
  ),
};

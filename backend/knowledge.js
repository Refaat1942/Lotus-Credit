/**
 * Everything the app knows about the companies, written out as text for the smart assistant:
 * the admin-edited rules, steps, notes, checklists, links, and the text read from the form/card pictures.
 */

const yes = (v) => (v === true ? 'لازم' : v === false ? 'مش لازم' : null);

const RULE_LABELS = [
  ['prescriptionValidity', 'صلاحية الروشتة / النموذج'],
  ['maxDispensePeriod', 'أقصى مدة صرف'],
  ['approvalValidity', 'صلاحية الموافقة'],
  ['financialLimit', 'الحد المالي'],
  ['priorApprovalRequired', 'الموافقة المسبقة مطلوبة إمتى'],
  ['copay', 'نسبة التحمل'],
  ['externalRxAllowed', 'الروشتة الخارجية'],
  ['diagnosisHelp', 'التشخيص'],
  ['alternativesPolicy', 'البدائل'],
];

const BOOL_LABELS = [
  ['cardRequired', 'الكارنية'],
  ['signatureRequired', 'توقيع المريض/المستلم'],
  ['stampRequired', 'ختم'],
  ['diagnosisRequired', 'التشخيص مكتوب'],
];

const list = (title, items) => {
  const clean = (items || []).map((x) => String(x || '').trim()).filter(Boolean);
  return clean.length ? `${title}:\n${clean.map((x) => `- ${x}`).join('\n')}` : null;
};

function guideStepTitle(key) {
  if (key === 'card') return 'خطوة فحص الكارنية';
  if (key === 'approval') return 'خطوة الموافقة';
  if (key === 'dispense') return 'خطوة الصرف';
  if (key.startsWith('form:')) return `خطوة طريقة الصرف «${key.slice(5)}»`;
  return `خطوة ${key}`;
}

/** One company as plain text, every field the admin can edit included. */
function companyKnowledge(c, mediaText = {}) {
  const r = c.rules || {};
  const media = c.media || [];
  const byId = Object.fromEntries(media.map((m) => [m.id, m]));
  const parts = [`### ${c.nameAr}${c.nameEn && c.nameEn !== c.nameAr ? ` (${c.nameEn})` : ''} [id: ${c.id}]`];

  const basics = [
    c.hotline && `الخط الساخن: ${c.hotline}`,
    c.approvalSystem && `نظام الموافقات: ${c.approvalSystem}`,
    c.approvalPortal && `بوابة الموافقات: ${c.approvalPortal}`,
    ...(c.contacts || []).filter((x) => x?.value).map((x) => `تواصل (${x.type}): ${x.value}`),
  ].filter(Boolean);
  if (basics.length) parts.push(basics.join('\n'));

  const rules = [
    ...RULE_LABELS.filter(([k]) => r[k]).map(([k, label]) => `${label}: ${r[k]}`),
    ...BOOL_LABELS.filter(([k]) => typeof r[k] === 'boolean').map(([k, label]) => `${label}: ${yes(r[k])}`),
  ];
  if (rules.length) parts.push(`شروط الصرف:\n${rules.map((x) => `- ${x}`).join('\n')}`);

  parts.push(list('طرق الصرف / أنواع الروشتات المقبولة', c.forms));
  parts.push(list('تعليمات فحص الكارنية', c.cardInstructions));
  parts.push(list('ملاحظات مهمة', r.importantNotes));
  parts.push(list('المحظورات / الممنوع', r.prohibitions));
  parts.push(list('قبل ما تقفل الفاتورة', c.rulesTipBullets));
  parts.push(list('بنود لازم تتعلّم في المراجعة الأخيرة', c.coachChecklistExtra));

  for (const [key, points] of Object.entries(c.guideStepPoints || {})) {
    parts.push(list(`نقاط ${guideStepTitle(key)}`, points));
  }

  // documents for each prescription type, with the text read from them
  const formDocs = [];
  (c.forms || []).forEach((form, i) => {
    const ids = c.formMedia?.[form] || [c.formMediaMap?.[form], c.formMediaByIndex?.[i]].filter(Boolean);
    const titles = [...new Set(ids)].map((id) => byId[id]?.title).filter(Boolean);
    if (titles.length) formDocs.push(`«${form}»: ${titles.join(' / ')}`);
  });
  parts.push(list('مستندات كل طريقة صرف', formDocs));

  parts.push(
    list(
      'روابط',
      (c.links || []).map((l) => `${l.label || ''}: ${String(l.url || '').replace(/^tel:|^mailto:/, '')}`),
    ),
  );

  const approvals = (c.approvalSamples || []).map((id) => byId[id]?.title).filter(Boolean);
  parts.push(list('أشكال الموافقات المرفوعة', approvals));

  const docs = media
    .map((m) => {
      const text = (mediaText[m.id] || '').trim();
      return `- ${m.title || 'صورة'}${m.page ? ` (صفحة ${m.page})` : ''}${text ? `\n  النص المكتوب في الصورة:\n  ${text.replace(/\n/g, '\n  ')}` : ''}`;
    })
    .filter(Boolean);
  if (docs.length) parts.push(`الصور والمستندات:\n${docs.join('\n')}`);

  const custom = Object.values(c.coachCopy?.messages || {})
    .map((v) => (typeof v === 'string' ? v : v?.ar))
    .filter(Boolean);
  parts.push(list('رسائل خاصة بالشركة في المرشد التفاعلي', custom));

  return parts.filter(Boolean).join('\n\n');
}

function generalKnowledge(general = {}) {
  return [
    list('فحص أي كارنية (لكل الشركات)', general.cardChecklist),
    list('الكارنية الإلكتروني', general.electronicCardRules),
    list('روابط الموافقات العامة', general.approvalLinks),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** The whole knowledge base; the company being viewed comes first. */
function knowledgeBase(rules, mediaText, focusId) {
  const companies = [...(rules.companies || [])].sort(
    (a, b) => (b.id === focusId) - (a.id === focusId) || (a.order || 0) - (b.order || 0),
  );
  return [
    `## عام\n${generalKnowledge(rules.general)}`,
    `## الشركات (${companies.length})\n${companies.map((c) => companyKnowledge(c, mediaText)).join('\n\n---\n\n')}`,
  ].join('\n\n');
}

// ---- local search (used when no AI key is set)

/** Arabic letters folded so spelling variants match (أ/إ/آ→ا، ى→ي، ة→ه، no diacritics). */
function normalizeAr(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\w\s؀-ۿ@.*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  'في من على عن الى الي او و يا هو هي ده دي دا اللي الي ايه إيه ازاي إزاي هل لو مع بس كده انا احنا عايز عاوز محتاج ممكن عشان علشان بتاع بتاعة بتاعه ما لا ايوه طيب اية كام امتي فين'.split(' ').map(normalizeAr),
);

const tokens = (text) =>
  normalizeAr(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP.has(w))
    // drop the Arabic article so "الكارنيه" matches "كارنيه"
    .map((w) => (w.length > 4 && w.startsWith('ال') ? w.slice(2) : w));

/** Every line of the knowledge base as a searchable passage, tagged with its company. */
function passages(rules, mediaText) {
  const out = [];
  const add = (companyId, text) => {
    let section = '';
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('###')) continue;
      if (!t.startsWith('-') && t.endsWith(':')) {
        section = t.slice(0, -1);
        continue;
      }
      out.push({ companyId, section, text: t.replace(/^- /, '') });
    }
  };
  add(null, generalKnowledge(rules.general));
  for (const c of rules.companies || []) add(c.id, companyKnowledge(c, mediaText));
  return out;
}

/** Best passages for a question (word overlap, rarer words count more), optionally inside some companies. */
function search(query, all, companyIds) {
  const q = tokens(query);
  if (!q.length) return [];
  const df = {};
  for (const p of all) for (const w of new Set(tokens(`${p.section || ''} ${p.text}`))) df[w] = (df[w] || 0) + 1;
  const scored = all
    .filter((p) => !companyIds?.length || companyIds.includes(p.companyId) || p.companyId === null)
    .map((p) => {
      const words = tokens(`${p.section || ''} ${p.text}`);
      let score = 0;
      for (const w of q) {
        if (words.some((x) => x === w)) score += 1 / Math.log(2 + (df[w] || 0));
        else if (w.length > 3 && words.some((x) => x.includes(w) || w.includes(x))) score += 0.5 / Math.log(2 + (df[w] || 0));
      }
      return { ...p, score };
    })
    .filter((p) => p.score > 0);
  return scored.sort((a, b) => b.score - a.score);
}

module.exports = { companyKnowledge, generalKnowledge, knowledgeBase, normalizeAr, passages, search };

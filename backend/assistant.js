/** Smart assistant — Egyptian Arabic + rules RAG + optional OpenAI */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const COMPANY_ALIASES = {
  axa: ['axa', 'اكسا', 'أكسا', 'yodawy', 'يوداوي', '16363'],
  metlife: ['metlife', 'ميتلايف', 'متلايف', '19097', 'icare', 'آي كير'],
  globemed: ['globemed', 'جلوب', 'جلوبميد', '16784'],
  nextcare: ['nextcare', 'نكست', 'نكستكير', 'pulse', 'بولس', '19154', 'اليانز'],
  mednet: ['mednet', 'مدنت', '17011'],
  'misr-healthcare': ['misr healthcare', 'مصر للتأمين', 'misr health', '19114', 'نيس دير'],
  amc: ['amc', 'أهلي', 'الاهلي', 'الأهلي', '19462'],
  medright: ['medright', 'med right', 'ميدرايت', '16380', '16830'],
  medmark: ['medmark', 'ميدمارك', '16816', 'horizon', 'هورايزن'],
  bupa: ['bupa', 'بوبا', '16816'],
  unicare: ['unicare', 'يونيكير', '19389'],
  'atomic-energy': ['طاقة ذرية', 'الطاقة الذرية', 'هيئة الطاقة'],
  egycare: ['egycare', 'ايجيكير', '16426'],
  sehatech: ['sehatech', 'sehaone', '16300', 'صحة'],
  'care-plus': ['care plus', 'كير بلاس', '17144'],
  'sesco-care': ['sesco', 'سيسكو', '01202842022'],
  petroshad: ['petroshad', 'petroshahd', 'بترو'],
  sumed: ['sumed', 'سوميد'],
};

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s\u0600-\u06FF@.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCompanies(query, companies) {
  const q = normalize(query);
  const scored = companies.map((c) => {
    let score = 0;
    const blob = normalize(
      [c.nameAr, c.nameEn, c.hotline, c.approvalSystem, ...(c.forms || []),
        ...(c.rules?.importantNotes || []), ...(c.links || []).map((l) => l.label)].join(' ')
    );
    if (blob.includes(q)) score += 10;
    (COMPANY_ALIASES[c.id] || []).forEach((alias) => {
      if (q.includes(normalize(alias)) || normalize(alias).includes(q)) score += 15;
    });
    q.split(' ').filter(Boolean).forEach((word) => {
      if (word.length > 2 && blob.includes(word)) score += 3;
    });
    return { company: c, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

function pickImages(company, query) {
  const media = company.media || [];
  if (!media.length) return [];
  const q = normalize(query);
  const cardKeywords = ['كارن', 'كارت', 'card', 'نموذج', 'form', 'صورة', 'photo'];
  const wantsVisual = cardKeywords.some((k) => q.includes(k)) || media.length <= 3;
  const photos = media.filter((m) => m.type === 'photo');
  const cards = media.filter((m) => m.type === 'card');
  const picked = wantsVisual
    ? [...photos.slice(0, 2), ...cards.slice(0, 1)]
    : [photos[0] || cards[0]].filter(Boolean);
  return picked.slice(0, 3).map((m) => ({ url: m.url, title: m.title, type: m.type }));
}

function buildCompanySummary(c) {
  const r = c.rules || {};
  const lines = [
    `🏢 ${c.nameAr} (${c.nameEn})`,
    c.hotline ? `📞 الخط الساخن: ${c.hotline}` : null,
    c.approvalSystem ? `💻 نظام الموافقات: ${c.approvalSystem}` : null,
    c.approvalPortal ? `🔗 البوابة: ${c.approvalPortal}` : null,
    r.prescriptionValidity ? `📅 صلاحية الروشتة: ${r.prescriptionValidity}` : null,
    r.maxDispensePeriod ? `⏱️ أقصى مدة صرف: ${r.maxDispensePeriod}` : null,
    r.financialLimit ? `💰 الحد المالي: ${r.financialLimit}` : null,
    r.copay ? `💳 التحمل: ${r.copay}` : null,
    c.forms?.length ? `📋 طرق الصرف: ${c.forms.join(' | ')}` : null,
    r.importantNotes?.length ? `⚠️ ملاحظات:\n${r.importantNotes.map((n) => `• ${n}`).join('\n')}` : null,
    r.prohibitions?.length ? `🚫 محظورات:\n${r.prohibitions.map((n) => `• ${n}`).join('\n')}` : null,
    c.links?.length ? `🔗 روابط: ${c.links.slice(0, 4).map((l) => l.label).join(' | ')}` : null,
  ];
  return lines.filter(Boolean).join('\n');
}

function egyptianFallbackAnswer(query, rules) {
  const q = normalize(query);
  const companies = rules.companies || [];
  const matches = findCompanies(query, companies);
  let images = [];
  let answer = '';

  if (/كارن|بطاق|الكترون|اشتراك|صلاح/i.test(query)) {
    answer = `📇 **فحص الكارنية:**\n${(rules.general?.cardChecklist || []).map((x) => `• ${x}`).join('\n')}\n\n`;
    answer += `📱 **كارنية إلكتروني:**\n${(rules.general?.electronicCardRules || []).map((x) => `• ${x}`).join('\n')}`;
    return { answer, images: [], companyId: null };
  }

  if (/روابط|بواب|موافق|لينك|link/i.test(query) && matches[0]) {
    const c = matches[0].company;
    answer = `تمام يا فندم، دي روابط ${c.nameAr}:\n\n`;
    (c.links || []).forEach((l) => {
      answer += `• **${l.label}**: ${l.url}\n`;
    });
    if (!c.links?.length && c.approvalPortal) {
      answer += `• **بوابة الموافقات**: ${c.approvalPortal}\n`;
    }
    images = pickImages(c, query);
    return { answer, images, companyId: c.id };
  }

  if (matches.length === 0) {
    answer = `معلش مش لاقي شركة مطابقة لسؤالك. 😅\n\n`;
    answer += `جرب تكتب اسم الشركة زي: **AXA**، **MetLife**، **GlobeMed**، **Nextcare**، **Bupa**، **Medmark**...\n\n`;
    answer += `أو اسأل بطريقة زي:\n• "شروط صرف AXA إزاي؟"\n• "كارنية MetLife"\n• "رابط يوداوي"\n• "محظورات Medmark"`;
    return { answer, images: [], companyId: null };
  }

  const top = matches[0].company;
  answer = `أيوه يا فندم، دي شروط **${top.nameAr}** 👇\n\n`;
  answer += buildCompanySummary(top);

  if (matches.length > 1) {
    answer += `\n\n💡 ممكن تقصد كمان: ${matches.slice(1).map((m) => m.company.nameAr).join('، ')}`;
  }

  images = pickImages(top, query);
  return { answer, images, companyId: top.id };
}

async function openaiAnswer(query, rules, context) {
  const system = `أنت مساعد ذكي لصيدليات لوتس — قسم الآجل. ترد بالعامية المصرية المهنية (زي الصيدلي مع زميله).
مهمتك: شرح شروط صرف التعاقدات التأمينية بدقة من البيانات المعطاة فقط.
- لو السؤال عن شركة معينة، اشرح خطوات الصرف، الكارنية، الموافقات، المحظورات.
- اذكر الأرقام والروابط من البيانات.
- لو محتاج صورة (كارنية/نموذج)، قول "هوريك الصورة تحت" — الصور هتتبعت تلقائي.
- متخترعش معلومات مش في البيانات.
- اختصر وخليك واضح وعملي.`;

  const companiesContext = (rules.companies || [])
    .map((c) => buildCompanySummary(c))
    .join('\n\n---\n\n')
    .slice(0, 120000);

  const userContent = `بيانات الشروط:\n${companiesContext.slice(0, 80000)}\n\n---\nسؤال الصيدلي: ${query}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) throw new Error('OpenAI request failed');
  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content || 'معلش حصل مشكلة، جرب تاني.';
  const matches = findCompanies(query, rules.companies || []);
  const images = matches[0] ? pickImages(matches[0].company, query) : [];
  return { answer, images, companyId: matches[0]?.company.id || null };
}

async function chat(query, rules) {
  if (!query?.trim()) {
    return {
      answer: 'اكتب سؤالك يا فندم 😊\nمثال: "AXA بصرف إزاي؟" أو "كارنية GlobeMed"',
      images: [],
      companyId: null,
    };
  }

  if (OPENAI_API_KEY) {
    try {
      return await openaiAnswer(query, rules);
    } catch {
      // fall through to local
    }
  }

  return egyptianFallbackAnswer(query, rules);
}

module.exports = { chat, findCompanies, pickImages };

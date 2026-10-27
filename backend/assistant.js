/** Smart assistant — Egyptian Arabic, answers from everything the app knows (OpenAI when a key is set, else local search). */
const { companyKnowledge, knowledgeBase, normalizeAr, passages, search } = require('./knowledge');

const DEFAULT_MODEL = 'gpt-4o-mini';
// OpenAI, or any service with the same API (OPENAI_BASE_URL)
const API_BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const COMPANY_ALIASES = {
  axa: ['axa', 'اكسا', 'yodawy', 'يوداوي', '16363'],
  metlife: ['metlife', 'ميتلايف', 'متلايف', 'ميت لايف', '19097', 'icare', 'اي كير'],
  globemed: ['globemed', 'جلوب', 'جلوبميد', 'جلوب ميد', '16784'],
  nextcare: ['nextcare', 'نكست', 'نكستكير', 'نكست كير', 'pulse', 'بولس', '19154', 'اليانز'],
  mednet: ['mednet', 'مدنت', 'ميدنت', '17011'],
  'misr-healthcare': ['misr healthcare', 'مصر للتامين', 'مصر هيلث', 'misr health', '19114', 'نيس دير'],
  amc: ['amc', 'اهلي', 'الاهلي'],
  medright: ['medright', 'med right', 'ميدرايت', 'ميد رايت', '16380', '16830'],
  medmark: ['medmark', 'ميدمارك', 'ميد مارك', 'horizon', 'هورايزن'],
  bupa: ['bupa', 'بوبا'],
  unicare: ['unicare', 'يونيكير', 'يوني كير', '19389'],
  'atomic-energy': ['طاقه ذريه', 'الطاقه الذريه', 'هيئه الطاقه'],
  egycare: ['egycare', 'ايجيكير', 'ايجي كير', '16426'],
  sehatech: ['sehatech', 'sehaone', 'صحه تك', '16300'],
  'care-plus': ['care plus', 'careplus', 'كير بلاس', '17144'],
  'sesco-care': ['sesco', 'سيسكو', '01202842022'],
  petroshad: ['petroshad', 'petroshahd', 'بتروشهد', 'بترو'],
  sumed: ['sumed', 'سوميد'],
};

/** Companies named in a text (by name, alias or hotline), best match first. */
function findCompanies(text, companies) {
  const q = ` ${normalizeAr(text)} `;
  return companies
    .map((c) => {
      const names = [c.nameAr, c.nameEn, c.hotline, ...(COMPANY_ALIASES[c.id] || [])].filter(Boolean).map(normalizeAr);
      const score = names.reduce((s, n) => (n.length > 1 && q.includes(n) ? s + n.length : s), 0);
      return { company: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.company);
}

/** Pictures worth showing with the answer: documents whose titles match the question, or the card when asked about it. */
function pickImages(company, text) {
  const media = company?.media || [];
  if (!media.length) return [];
  const q = normalizeAr(text);
  const words = q.split(' ').filter((w) => w.length > 2);
  const aboutCard = /كارن|كارت|بطاق|card/.test(q);
  const wantsPicture = /صور|شكل|نموذج|فورم|form|ورقه|روشته/.test(q);
  const scored = media
    .map((m) => {
      const t = normalizeAr(m.title);
      let s = words.reduce((n, w) => (t.includes(w) ? n + 1 : n), 0);
      if (aboutCard && m.type === 'card') s += 3;
      return { m, s };
    })
    .filter((x) => x.s > 0 || (wantsPicture && x.m.type === 'form'))
    .sort((a, b) => b.s - a.s);
  if (!aboutCard && !wantsPicture && !scored.some((x) => x.s >= 2)) return [];
  return scored.slice(0, 3).map(({ m }) => ({ url: m.url, title: m.title, type: m.type }));
}

const SYSTEM = `إنت «مساعد لوتس» — زميل خبرة في قسم الأجل بصيدليات لوتس، بتساعد الصيدلي يصرف روشتات التأمين صح.
معاك تحت «قاعدة البيانات» كل حاجة البرنامج يعرفها عن كل شركة: الشروط، الخطوات والنقاط تحت كل خطوة، الملاحظات، المحظورات، «قبل ما تقفل الفاتورة»، تعليمات الكارنية، طرق الصرف ومستنداتها، الروابط والأرقام، والنص المكتوب جوه صور النماذج والجداول.

إزاي ترد:
1. جاوب من قاعدة البيانات بس. دوّر في كل أقسام الشركة — خصوصاً «النص المكتوب في الصورة» لأن فيه تفاصيل كتير مش مكتوبة في حتة تانية.
2. ادخل في التفاصيل الدقيقة: الأرقام، المدد بالأيام، الحدود المالية، النسب، أسماء الأنظمة، التواريخ اللي لازم تتطابق، واللي مغطّى واللي مش مغطّى.
3. لو السؤال عن أكتر من شركة أو «مين الشركات اللي…» قارن بينهم أو طلّع قايمة بكل الشركات اللي ينطبق عليها.
4. لو الشركة مش واضحة: اعتمد على الشركة اللي الصيدلي فاتح صفحتها أو اللي كنتوا بتتكلموا عنها وقول اسمها في أول الرد. لو مفيش، اسأله يقصد أنهي شركة (أو جاوب لو الإجابة عامة لكل الشركات).
5. لو المعلومة مش موجودة في البيانات قول بوضوح «المعلومة دي مش موجودة عندي» وقوله يكلّم خدمة عملاء الشركة (واكتب الرقم لو موجود). ممنوع تخمّن أو تألّف أي شرط.
6. لو فيه محظور أو تحذير له علاقة بالسؤال، نبّه عليه في الآخر بـ ⚠️.
7. الأسلوب: عامية مصرية مهنية زي زميل، مباشر من غير مقدمات، نقاط قصيرة مرقّمة أو بشرطة، و**بولد** للأرقام والحاجات المهمة. لو السؤال بسيط جاوب في سطرين.`;

async function callOpenAI({ apiKey, model, messages }) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1500 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `OpenAI ${res.status}`);
    err.status = res.status;
    err.code = data.error?.code;
    throw err;
  }
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function aiAnswer({ message, history, focus, rules, mediaText, apiKey, model }) {
  const page = focus ? `الصيدلي دلوقتي فاتح صفحة شركة: ${focus.nameAr} (${focus.nameEn}).` : 'الصيدلي في الصفحة الرئيسية.';
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'system', content: `${page}\n\n# قاعدة البيانات\n${knowledgeBase(rules, mediaText, focus?.id)}` },
    ...history,
    { role: 'user', content: message },
  ];
  try {
    return await callOpenAI({ apiKey, model, messages });
  } catch (err) {
    // a model name the account can't use: retry once on the default model
    if (model !== DEFAULT_MODEL && (err.status === 404 || err.code === 'model_not_found' || /model/i.test(err.message))) {
      return callOpenAI({ apiKey, model: DEFAULT_MODEL, messages });
    }
    throw err;
  }
}

const GENERAL_QUESTION = /^(?:ازاي|ازي)?\s*(?:اصرف|بصرف|بيتصرف|الصرف|شروط|شروطها|تفاصيل|كل حاجه|خطوات)(?:\s|$)/;

/** Without an AI key: the best matching lines from the knowledge base, grouped by company. */
function localAnswer({ message, focus, rules, mediaText }) {
  const companies = rules.companies || [];
  const q = normalizeAr(message);
  const short = q.split(' ').length <= 3;

  if (focus && (GENERAL_QUESTION.test(q) || (short && findCompanies(message, companies).length))) {
    const text = companyKnowledge(focus, mediaText)
      .split('\n\n')
      .filter((s) => !s.startsWith('الصور والمستندات'))
      .map((s) => s.replace(/^### (.+?) \[id: .+\]$/, '🏢 **$1**').replace(/^([^\n-][^\n]*):\n/, '**$1:**\n'))
      .join('\n\n');
    return `دي كل تفاصيل **${focus.nameAr}** 👇\n\n${text}`;
  }

  const hits = search(message, passages(rules, mediaText), focus ? [focus.id] : null).slice(0, 8);
  if (!hits.length) {
    return focus
      ? `مش لاقي حاجة عن ده في بيانات **${focus.nameAr}** 😅\nجرّب تسأل بكلمات تانية، أو كلّم خدمة العملاء${focus.hotline ? ` على **${focus.hotline}**` : ''}.`
      : 'مش لاقي إجابة لسؤالك 😅\nاكتب اسم الشركة مع السؤال، زي: «أقصى مدة صرف MetLife» أو «محظورات Bupa».';
  }
  const names = Object.fromEntries(companies.map((c) => [c.id, c.nameAr]));
  const groups = new Map();
  for (const h of hits) {
    const key = h.companyId || '_';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(h);
  }
  return [...groups.entries()]
    .map(([id, rows]) => `**${id === '_' ? 'عام (كل الشركات)' : names[id]}:**\n${rows.map((h) => `• ${h.section ? `${h.section}: ` : ''}${h.text}`).join('\n')}`)
    .join('\n\n');
}

/**
 * Answers one question. `history` is the conversation so far (oldest first),
 * `companyId` the company page the pharmacist has open (if any).
 */
async function chat({ message, history = [], companyId }, rules, { apiKey, model, mediaText = {} } = {}) {
  const q = String(message || '').trim();
  if (!q) {
    return { answer: 'اكتب سؤالك يا فندم 😊\nمثال: «أقصى مدة صرف MetLife» أو «إيه الممنوع في Bupa؟»', images: [], companyId: null, engine: 'none' };
  }
  const companies = rules.companies || [];
  const turns = history
    .filter((h) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.trim())
    .slice(-8)
    .map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }));

  // the company this question is about: named now, else the last one talked about, else the open page
  const lastUserTalk = turns.filter((t) => t.role === 'user').map((t) => t.content).reverse();
  const focus =
    findCompanies(q, companies)[0] ||
    lastUserTalk.map((t) => findCompanies(t, companies)[0]).find(Boolean) ||
    companies.find((c) => c.id === companyId) ||
    null;

  let answer = '';
  let engine = 'local';
  if (apiKey) {
    try {
      answer = await aiAnswer({ message: q, history: turns, focus, rules, mediaText, apiKey, model: model || DEFAULT_MODEL });
      engine = 'ai';
    } catch (err) {
      console.error('Assistant AI error:', err.message);
    }
  }
  if (!answer) answer = localAnswer({ message: q, focus, rules, mediaText });

  const named = findCompanies(`${q}\n${answer}`, companies);
  const imgCompany = findCompanies(q, companies)[0] || focus || named[0];
  return { answer, images: pickImages(imgCompany, q), companyId: imgCompany?.id || null, engine };
}

/** Reads all the text in a form/card picture (for the knowledge base). */
async function readImageText({ apiKey, model, dataUrl, title }) {
  return callOpenAI({
    apiKey,
    model: model || DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'انسخ كل النص المكتوب في الصورة بالظبط زي ما هو (عربي وإنجليزي وأرقام). الجداول: اكتب كل صف في سطر بالشكل «العمود: القيمة». متضيفش أي شرح أو تعليق من عندك. لو مفيش نص اكتب: لا يوجد نص.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `صورة: ${title || ''}` },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        ],
      },
    ],
  });
}

module.exports = { chat, findCompanies, pickImages, readImageText, DEFAULT_MODEL, API_BASE };

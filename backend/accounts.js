const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');

const ADMIN_SECTIONS = ['dashboard', 'companies', 'branding', 'content', 'documents', 'backups'];
const BRANCH_FEATURES = ['coach', 'assistant'];

function loadStore() {
  try {
    const store = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
    return { settings: { requireLogin: false, ...(store.settings || {}) }, users: store.users || [] };
  } catch {
    return { settings: { requireLogin: false }, users: [] };
  }
}

function saveStore(store) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.salt || !user?.hash || typeof password !== 'string') return false;
  const actual = crypto.scryptSync(password, user.salt, 64);
  const expected = Buffer.from(user.hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

/** Constant-time string compare, so the owner password can't be guessed by timing. */
function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

function publicUser(u) {
  const { salt, hash, ...rest } = u;
  return rest;
}

const OWNER = {
  id: 'owner',
  username: 'admin',
  name: 'المالك',
  role: 'owner',
  active: true,
  companies: 'all',
  sections: [...ADMIN_SECTIONS, 'users'],
  features: [...BRANCH_FEATURES],
};

function findUser(store, username) {
  const name = String(username || '').trim().toLowerCase();
  return store.users.find((u) => u.username.toLowerCase() === name);
}

function canSeeCompany(user, companyId) {
  return !user || user.companies === 'all' || (Array.isArray(user.companies) && user.companies.includes(companyId));
}

function hasSection(user, section) {
  return user.role === 'owner' || (user.role === 'admin' && (user.sections || []).includes(section));
}

function hasFeature(user, feature) {
  return !user || user.role === 'owner' || (user.features || []).includes(feature);
}

/** Normalises an admin-submitted account; returns { user } or { error }. */
function sanitizeUserInput(input, { isNew }) {
  const username = String(input.username || '').trim();
  if (isNew || input.username !== undefined) {
    if (!/^[^\s]{2,40}$/.test(username)) return { error: 'اسم المستخدم لازم يكون من 2 لـ 40 حرف بدون مسافات' };
    if (username.toLowerCase() === 'admin') return { error: 'اسم المستخدم admin محجوز للمالك' };
  }
  if (isNew && (!input.password || String(input.password).length < 4)) {
    return { error: 'كلمة المرور لازم تكون 4 حروف على الأقل' };
  }
  if (!isNew && input.password && String(input.password).length < 4) {
    return { error: 'كلمة المرور لازم تكون 4 حروف على الأقل' };
  }
  const role = input.role === 'admin' ? 'admin' : 'branch';
  const companies =
    input.companies === 'all' || !Array.isArray(input.companies)
      ? 'all'
      : input.companies.filter((c) => typeof c === 'string');
  return {
    user: {
      username,
      name: String(input.name || username).trim().slice(0, 80),
      role,
      active: input.active !== false,
      companies,
      sections: role === 'admin' ? (input.sections || []).filter((s) => ADMIN_SECTIONS.includes(s)) : [],
      features: (input.features || BRANCH_FEATURES).filter((f) => BRANCH_FEATURES.includes(f)),
    },
  };
}

module.exports = {
  ADMIN_SECTIONS,
  BRANCH_FEATURES,
  OWNER,
  USERS_PATH,
  loadStore,
  saveStore,
  hashPassword,
  verifyPassword,
  safeEqual,
  publicUser,
  findUser,
  canSeeCompany,
  hasSection,
  hasFeature,
  sanitizeUserInput,
};

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lotus-admin-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'lotus-credit-secret-key-change-in-production';
const RULES_PATH = path.join(__dirname, '..', 'data', 'rules.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const assetsPath = path.join(__dirname, '..', 'data', 'assets');
const logosDir = path.join(assetsPath, 'logos');
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath));
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const { chat } = require('./assistant');
const accounts = require('./accounts');
const activity = require('./activity');

const { OWNER, loadStore, saveStore, publicUser, canSeeCompany, hasSection, hasFeature } = accounts;
const { logEvent, actorOf } = activity;

function readRules() {
  return JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
}

function writeRules(data) {
  fs.writeFileSync(RULES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const backupsDir = path.join(__dirname, '..', 'data', 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
const BACKUP_RETENTION = 14;

function dirSize(dirPath) {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function runBackup(reason = 'scheduled') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupsDir, stamp);
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(RULES_PATH)) {
    fs.cpSync(RULES_PATH, path.join(dest, 'rules.json'));
  }
  if (fs.existsSync(assetsPath)) {
    fs.cpSync(assetsPath, path.join(dest, 'assets'), { recursive: true });
  }
  if (fs.existsSync(accounts.USERS_PATH)) {
    fs.cpSync(accounts.USERS_PATH, path.join(dest, 'users.json'));
  }
  const manifest = {
    name: stamp,
    reason,
    createdAt: new Date().toISOString(),
    sizeBytes: dirSize(dest),
  };
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const all = fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const excess = all.length - BACKUP_RETENTION;
  if (excess > 0) {
    for (const name of all.slice(0, excess)) {
      fs.rmSync(path.join(backupsDir, name), { recursive: true, force: true });
    }
  }

  return manifest;
}

function listBackups() {
  return fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const manifestPath = path.join(backupsDir, e.name, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch {
          /* fall through */
        }
      }
      return { name: e.name, reason: 'unknown', createdAt: e.name, sizeBytes: dirSize(path.join(backupsDir, e.name)) };
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

const hasBackupToday = () => {
  const today = new Date().toISOString().slice(0, 10);
  return fs.readdirSync(backupsDir).some((name) => name.startsWith(today));
};

try {
  if (!hasBackupToday()) runBackup('startup');
} catch (err) {
  console.error('Initial backup failed:', err);
}
setInterval(() => {
  try {
    runBackup('scheduled');
    activity.cleanupLogs();
  } catch (err) {
    console.error('Scheduled backup failed:', err);
  }
}, 24 * 60 * 60 * 1000);

function tokenOf(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

/** The signed-in account, re-read on every request so disabling or editing an account applies at once. */
function resolveUser(req) {
  const token = tokenOf(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.sub === 'owner') return OWNER;
    const user = loadStore().users.find((u) => u.id === payload.sub);
    return user && user.active ? publicUser(user) : null;
  } catch {
    return null;
  }
}

/** Admin-panel access; with sections, the account needs at least one of them. */
function requireAdmin(...sections) {
  return (req, res, next) => {
    const user = resolveUser(req);
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sections.length && !sections.some((sec) => hasSection(user, sec))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = user;
    next();
  };
}

function requireOwner(req, res, next) {
  const user = resolveUser(req);
  if (!user || user.role !== 'owner') return res.status(403).json({ error: 'Forbidden' });
  req.user = user;
  next();
}

function guardCompany(req, res) {
  if (canSeeCompany(req.user, req.params.id)) return true;
  res.status(403).json({ error: 'Forbidden' });
  return false;
}

/** Public data access: returns the account (or null for a guest), or undefined after answering 401. */
function publicViewer(req, res) {
  const user = resolveUser(req);
  if (!user && loadStore().settings.requireLogin) {
    res.status(401).json({ error: 'login_required' });
    return undefined;
  }
  return user;
}

function visibleRules(user) {
  const data = readRules();
  if (user && user.companies !== 'all') data.companies = data.companies.filter((c) => canSeeCompany(user, c.id));
  return data;
}

const companyName = (id) => readRules().companies.find((c) => c.id === id)?.nameAr || id;

const hits = new Map();
function rateLimited(key, maxPerMinute) {
  const now = Date.now();
  const w = hits.get(key) || { start: now, n: 0 };
  if (now - w.start > 60000) {
    w.start = now;
    w.n = 0;
  }
  w.n += 1;
  hits.set(key, w);
  return w.n > maxPerMinute;
}

function signToken(user, expiresIn) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn });
}

/** Checks username + password against the owner and the stored accounts; logs the attempt. */
function attemptLogin(req, res, { adminOnly }) {
  if (rateLimited(`login:${req.ip}`, 10)) return res.status(429).json({ error: 'Too many attempts' });
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || username.toLowerCase() === 'admin') {
    if (accounts.safeEqual(password, ADMIN_PASSWORD)) {
      logEvent({ type: 'login_ok', ...actorOf(OWNER), detail: adminOnly ? 'لوحة الإدارة' : 'التطبيق' });
      return res.json({ token: signToken(OWNER, adminOnly ? '8h' : '30d'), user: OWNER });
    }
  } else {
    const store = loadStore();
    const found = accounts.findUser(store, username);
    if (found && found.active && accounts.verifyPassword(password, found) && (!adminOnly || found.role === 'admin')) {
      found.lastLoginAt = new Date().toISOString();
      saveStore(store);
      const user = publicUser(found);
      logEvent({ type: 'login_ok', ...actorOf(user), detail: adminOnly ? 'لوحة الإدارة' : 'التطبيق' });
      return res.json({ token: signToken(user, adminOnly ? '8h' : '30d'), user });
    }
  }
  logEvent({ type: 'login_fail', user: username || 'admin', userName: username || 'admin', role: 'unknown' });
  return res.status(401).json({ error: 'Invalid credentials' });
}

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/public-config', (_, res) => {
  res.json({ requireLogin: !!loadStore().settings.requireLogin });
});

app.post('/api/auth/login', (req, res) => attemptLogin(req, res, { adminOnly: false }));

app.get('/api/auth/me', (req, res) => {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user });
});

app.post('/api/events', (req, res) => {
  const user = resolveUser(req);
  const { type, companyId } = req.body || {};
  if (!activity.CLIENT_EVENT_TYPES.includes(type)) return res.status(400).json({ error: 'Unknown event' });
  if (rateLimited(`events:${req.ip}`, 120)) return res.status(429).json({ error: 'Too many events' });
  const id = typeof companyId === 'string' ? companyId.slice(0, 80) : undefined;
  logEvent({ type, ...actorOf(user), ...(id ? { companyId: id, companyName: companyName(id) } : {}) });
  res.status(204).end();
});

app.get('/api/rules', (req, res) => {
  const user = publicViewer(req, res);
  if (user === undefined) return;
  try {
    res.json(visibleRules(user));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load rules' });
  }
});

app.get('/api/companies', (req, res) => {
  const user = publicViewer(req, res);
  if (user === undefined) return;
  try {
    res.json(visibleRules(user).companies);
  } catch {
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

app.get('/api/companies/:id', (req, res) => {
  const user = publicViewer(req, res);
  if (user === undefined) return;
  try {
    const { companies } = visibleRules(user);
    const company = companies.find((c) => c.id === req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch {
    res.status(500).json({ error: 'Failed to load company' });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  const user = publicViewer(req, res);
  if (user === undefined) return;
  if (!hasFeature(user, 'assistant')) return res.status(403).json({ error: 'Forbidden', answer: 'المساعد غير متاح لحسابك.' });
  try {
    const { message } = req.body;
    if (typeof message === 'string' && message.trim()) {
      logEvent({ type: 'assistant_question', ...actorOf(user), detail: message.trim().slice(0, 300) });
    }
    const rules = visibleRules(user);
    const result = await chat(message, rules);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Assistant failed', answer: 'معلش حصل خطأ، جرب تاني.' });
  }
});

app.post('/api/admin/login', (req, res) => attemptLogin(req, res, { adminOnly: true }));

app.get('/api/admin/me', requireAdmin(), (req, res) => res.json({ user: req.user }));

app.get('/api/admin/rules', requireAdmin(), (req, res) => {
  try {
    res.json(visibleRules(req.user));
  } catch {
    res.status(500).json({ error: 'Failed to load rules' });
  }
});

/** A non-owner admin only changes the parts their account allows; everything else is kept as is. */
function mergeRulesForUser(current, incoming, user) {
  if (user.role === 'owner') return incoming;
  const out = { ...current };
  if (hasSection(user, 'branding')) out.branding = incoming.branding;
  if (hasSection(user, 'content')) {
    for (const key of ['ui', 'guide', 'coach', 'general', 'meta']) out[key] = incoming[key];
  }
  if (hasSection(user, 'companies') && Array.isArray(incoming.companies)) {
    out.companies =
      user.companies === 'all'
        ? incoming.companies
        : current.companies.map((c) =>
            canSeeCompany(user, c.id) ? incoming.companies.find((x) => x.id === c.id) || c : c,
          );
  }
  return out;
}

app.put('/api/admin/rules', requireAdmin('companies', 'branding', 'content', 'documents'), (req, res) => {
  try {
    writeRules(mergeRulesForUser(readRules(), req.body, req.user));
    logEvent({ type: 'admin_save', ...actorOf(req.user), detail: 'حفظ التعديلات' });
    res.json({ success: true, message: 'Rules updated successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to save rules' });
  }
});

app.put('/api/admin/companies/:id', requireAdmin('companies'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const data = readRules();
    const idx = data.companies.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Company not found' });
    data.companies[idx] = { ...data.companies[idx], ...req.body, id: req.params.id };
    writeRules(data);
    res.json(data.companies[idx]);
  } catch {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

const canManageAllCompanies = (user) => hasSection(user, 'companies') && user.companies === 'all';

app.post('/api/admin/companies', requireAdmin('companies'), (req, res) => {
  if (!canManageAllCompanies(req.user)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = readRules();
    const company = { ...req.body, id: req.body.id || `company-${Date.now()}` };
    data.companies.push(company);
    writeRules(data);
    res.status(201).json(company);
  } catch {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

app.delete('/api/admin/companies/:id', requireAdmin('companies'), (req, res) => {
  if (!canManageAllCompanies(req.user)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const data = readRules();
    data.companies = data.companies.filter((c) => c.id !== req.params.id);
    writeRules(data);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

app.post('/api/admin/companies/:id/logo', requireAdmin('companies'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Missing image data' });
    }
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid image format' });
    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!['png', 'jpg', 'webp', 'svg+xml', 'svg'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    const fileExt = ext.replace('+xml', '').replace('svg', 'svg');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 2MB)' });
    }
    const filename = `${req.params.id}.${fileExt === 'svg' ? 'svg' : fileExt}`;
    fs.writeFileSync(path.join(logosDir, filename), buffer);
    const logoUrl = `/assets/logos/${filename}`;
    const data = readRules();
    const idx = data.companies.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Company not found' });
    data.companies[idx].logoUrl = logoUrl;
    writeRules(data);
    logEvent({ type: 'logo_upload', ...actorOf(req.user), companyId: req.params.id, companyName: data.companies[idx].nameAr });
    res.json({ logoUrl, company: data.companies[idx] });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

function stripMediaReferences(company, mediaId) {
  if (Array.isArray(company.approvalSamples)) {
    company.approvalSamples = company.approvalSamples.filter((id) => id !== mediaId);
  }
  if (company.formMedia) {
    for (const key of Object.keys(company.formMedia)) {
      company.formMedia[key] = company.formMedia[key].filter((id) => id !== mediaId);
    }
  }
  if (company.formMediaMap) {
    for (const key of Object.keys(company.formMediaMap)) {
      if (company.formMediaMap[key] === mediaId) delete company.formMediaMap[key];
    }
    if (!Object.keys(company.formMediaMap).length) delete company.formMediaMap;
  }
  if (company.formMediaByIndex) {
    company.formMediaByIndex = company.formMediaByIndex.map((id) => (id === mediaId ? '' : id));
    if (!company.formMediaByIndex.some(Boolean)) delete company.formMediaByIndex;
  }
  if (company.coachAnswerMedia) {
    for (const key of Object.keys(company.coachAnswerMedia)) {
      if (company.coachAnswerMedia[key] === mediaId) delete company.coachAnswerMedia[key];
    }
    if (!Object.keys(company.coachAnswerMedia).length) delete company.coachAnswerMedia;
  }
  if (company.stepMediaMap) {
    for (const key of Object.keys(company.stepMediaMap)) {
      const val = company.stepMediaMap[key];
      // an empty list is kept on purpose: it means "no photos", not "use the automatic one"
      if (Array.isArray(val)) company.stepMediaMap[key] = val.filter((id) => id !== mediaId);
      else if (val === mediaId) company.stepMediaMap[key] = [];
    }
  }
  return company;
}

app.put('/api/admin/companies/:id/media/:mediaId', requireAdmin('companies', 'documents'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const { title, dataUrl } = req.body;
    const data = readRules();
    const cIdx = data.companies.findIndex((c) => c.id === req.params.id);
    if (cIdx === -1) return res.status(404).json({ error: 'Company not found' });
    const company = data.companies[cIdx];
    const mIdx = (company.media || []).findIndex((m) => m.id === req.params.mediaId);
    if (mIdx === -1) return res.status(404).json({ error: 'Media not found' });

    if (typeof title === 'string' && title.trim()) {
      company.media[mIdx].title = title.trim().slice(0, 120);
    }

    if (dataUrl && typeof dataUrl === 'string') {
      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'Invalid image format' });
      let ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (!['png', 'jpg', 'webp'].includes(ext)) {
        return res.status(400).json({ error: 'Unsupported image type' });
      }
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 3 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large (max 3MB)' });
      }
      const companyDir = path.join(assetsPath, 'companies', company.id);
      if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });
      const filename = `coach_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(companyDir, filename), buffer);
      const oldUrl = company.media[mIdx].url;
      company.media[mIdx].url = `/assets/companies/${company.id}/${filename}`;
      if (oldUrl && oldUrl.startsWith('/assets/companies/')) {
        const oldPath = path.join(assetsPath, oldUrl.replace('/assets/', ''));
        fs.unlink(oldPath, () => {});
      }
    }

    data.companies[cIdx] = company;
    writeRules(data);
    logEvent({ type: 'media_update', ...actorOf(req.user), companyId: company.id, companyName: company.nameAr, detail: company.media[mIdx].title });
    res.json({ media: company.media[mIdx], company });
  } catch (err) {
    console.error('Media update error:', err);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

app.delete('/api/admin/companies/:id/media/:mediaId', requireAdmin('companies', 'documents'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const data = readRules();
    const cIdx = data.companies.findIndex((c) => c.id === req.params.id);
    if (cIdx === -1) return res.status(404).json({ error: 'Company not found' });
    const company = data.companies[cIdx];
    const item = (company.media || []).find((m) => m.id === req.params.mediaId);
    if (!item) return res.status(404).json({ error: 'Media not found' });

    company.media = company.media.filter((m) => m.id !== req.params.mediaId);
    stripMediaReferences(company, req.params.mediaId);
    data.companies[cIdx] = company;
    writeRules(data);
    logEvent({ type: 'media_delete', ...actorOf(req.user), companyId: company.id, companyName: company.nameAr, detail: item.title });

    if (item.url && item.url.startsWith('/assets/companies/')) {
      const filePath = path.join(assetsPath, item.url.replace('/assets/', ''));
      fs.unlink(filePath, () => {});
    }

    res.json({ success: true, company });
  } catch (err) {
    console.error('Media delete error:', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

app.post('/api/admin/companies/:id/media', requireAdmin('companies', 'documents'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const { dataUrl, title } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Missing image data' });
    }
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid image format' });
    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!['png', 'jpg', 'webp'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 3MB)' });
    }

    const cid = req.params.id;
    const companyDir = path.join(assetsPath, 'companies', cid);
    if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });

    const stamp = Date.now();
    const filename = `coach_${stamp}.${ext}`;
    fs.writeFileSync(path.join(companyDir, filename), buffer);

    const data = readRules();
    const idx = data.companies.findIndex((c) => c.id === cid);
    if (idx === -1) return res.status(404).json({ error: 'Company not found' });

    const company = data.companies[idx];
    if (!company.media) company.media = [];
    const mediaItem = {
      id: `${cid}-coach-${stamp}`,
      type: 'photo',
      title: (title || 'صورة مرشد').slice(0, 120),
      url: `/assets/companies/${cid}/${filename}`,
      page: 0,
      links: [],
    };
    company.media.push(mediaItem);
    data.companies[idx] = company;
    writeRules(data);
    logEvent({ type: 'media_upload', ...actorOf(req.user), companyId: cid, companyName: company.nameAr, detail: mediaItem.title });
    res.json({ media: mediaItem, company });
  } catch (err) {
    console.error('Coach media upload error:', err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

app.get('/api/admin/backups', requireAdmin('backups'), (_, res) => {
  try {
    res.json(listBackups());
  } catch {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

app.post('/api/admin/backups', requireAdmin('backups'), (req, res) => {
  try {
    const manifest = runBackup('manual');
    logEvent({ type: 'backup_create', ...actorOf(req.user) });
    res.json(manifest);
  } catch (err) {
    console.error('Manual backup error:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

app.delete('/api/admin/backups/:name', requireAdmin('backups'), (req, res) => {
  try {
    const dir = path.join(backupsDir, path.basename(req.params.name));
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Backup not found' });
    fs.rmSync(dir, { recursive: true, force: true });
    logEvent({ type: 'backup_delete', ...actorOf(req.user), detail: path.basename(req.params.name) });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

app.post('/api/admin/backups/:name/restore', requireAdmin('backups'), (req, res) => {
  try {
    const dir = path.join(backupsDir, path.basename(req.params.name));
    const rulesBackup = path.join(dir, 'rules.json');
    const assetsBackup = path.join(dir, 'assets');
    if (!fs.existsSync(dir) || !fs.existsSync(rulesBackup)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    runBackup('before-restore');

    fs.cpSync(rulesBackup, RULES_PATH);
    if (fs.existsSync(assetsPath)) fs.rmSync(assetsPath, { recursive: true, force: true });
    if (fs.existsSync(assetsBackup)) fs.cpSync(assetsBackup, assetsPath, { recursive: true });
    const usersBackup = path.join(dir, 'users.json');
    if (fs.existsSync(usersBackup)) fs.cpSync(usersBackup, accounts.USERS_PATH);
    logEvent({ type: 'backup_restore', ...actorOf(req.user), detail: path.basename(req.params.name) });

    res.json({ success: true, restored: req.params.name });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

app.get('/api/admin/users', requireOwner, (_, res) => {
  const store = loadStore();
  res.json({ settings: store.settings, users: store.users.map(publicUser) });
});

app.post('/api/admin/users', requireOwner, (req, res) => {
  const store = loadStore();
  const { user, error } = accounts.sanitizeUserInput(req.body, { isNew: true });
  if (error) return res.status(400).json({ error });
  if (accounts.findUser(store, user.username)) return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
  const created = {
    id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ...user,
    ...accounts.hashPassword(String(req.body.password)),
    createdAt: new Date().toISOString(),
  };
  store.users.push(created);
  saveStore(store);
  logEvent({ type: 'user_create', ...actorOf(req.user), detail: `${created.name} (${created.username})` });
  res.status(201).json(publicUser(created));
});

app.put('/api/admin/users/:id', requireOwner, (req, res) => {
  const store = loadStore();
  const idx = store.users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const current = store.users[idx];
  const { user, error } = accounts.sanitizeUserInput({ ...publicUser(current), ...req.body }, { isNew: false });
  if (error) return res.status(400).json({ error });
  const clash = accounts.findUser(store, user.username);
  if (clash && clash.id !== current.id) return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
  store.users[idx] = {
    ...current,
    ...user,
    ...(req.body.password ? accounts.hashPassword(String(req.body.password)) : {}),
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  logEvent({ type: 'user_update', ...actorOf(req.user), detail: `${user.name} (${user.username})` });
  res.json(publicUser(store.users[idx]));
});

app.delete('/api/admin/users/:id', requireOwner, (req, res) => {
  const store = loadStore();
  const found = store.users.find((u) => u.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'User not found' });
  store.users = store.users.filter((u) => u.id !== req.params.id);
  saveStore(store);
  logEvent({ type: 'user_delete', ...actorOf(req.user), detail: `${found.name} (${found.username})` });
  res.json({ success: true });
});

app.put('/api/admin/settings', requireOwner, (req, res) => {
  const store = loadStore();
  store.settings = { ...store.settings, requireLogin: !!req.body.requireLogin };
  saveStore(store);
  logEvent({ type: 'settings_update', ...actorOf(req.user), detail: store.settings.requireLogin ? 'تفعيل دخول الفروع الإجباري' : 'إلغاء دخول الفروع الإجباري' });
  res.json(store.settings);
});

/** Events an admin may see: a company-restricted admin only sees events for their companies. */
function eventsFor(req) {
  const range = activity.parseRange(req.query.from, req.query.to, req.query.tz);
  const events = activity
    .readEvents(range)
    .filter((e) => !e.companyId || canSeeCompany(req.user, e.companyId));
  return { range, events };
}

app.get('/api/admin/reports', requireAdmin('dashboard'), (req, res) => {
  try {
    const { range, events } = eventsFor(req);
    const names = Object.fromEntries(readRules().companies.map((c) => [c.id, c.nameAr]));
    res.json(activity.summarize(events, range, names));
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Failed to build report' });
  }
});

app.get('/api/admin/logs', requireAdmin('dashboard'), (req, res) => {
  const { events } = eventsFor(req);
  const filtered = activity.filterEvents(events, req.query);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  res.json({ total: filtered.length, items: filtered.slice(offset, offset + limit) });
});

const EVENT_LABELS = {
  company_view: 'زيارة شركة',
  coach_start: 'بدء المرشد',
  coach_finish: 'إنهاء الصرف',
  assistant_question: 'سؤال للمساعد',
  login_ok: 'تسجيل دخول',
  login_fail: 'محاولة دخول فاشلة',
  admin_save: 'حفظ تعديلات',
  media_upload: 'رفع صورة',
  media_update: 'تعديل صورة',
  media_delete: 'حذف صورة',
  logo_upload: 'رفع شعار',
  backup_create: 'نسخة احتياطية',
  backup_restore: 'استرجاع نسخة',
  backup_delete: 'حذف نسخة',
  user_create: 'إضافة مستخدم',
  user_update: 'تعديل مستخدم',
  user_delete: 'حذف مستخدم',
  settings_update: 'تغيير الإعدادات',
};

app.get('/api/admin/logs.csv', requireAdmin('dashboard'), (req, res) => {
  const { range, events } = eventsFor(req);
  const rows = activity.filterEvents(events, req.query);
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const local = (iso) => new Date(Date.parse(iso) + range.offset).toISOString().replace('T', ' ').slice(0, 19);
  const lines = [
    ['الوقت', 'النوع', 'المستخدم', 'الاسم', 'الشركة', 'التفاصيل'].map(cell).join(','),
    ...rows.map((e) =>
      [local(e.t), EVENT_LABELS[e.type] || e.type, e.user, e.userName, e.companyName || e.companyId || '', e.detail || '']
        .map(cell)
        .join(','),
    ),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="lotus-logs-${range.from}_${range.to}.csv"`);
  res.send(`\uFEFF${lines.join('\r\n')}`);
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Lotus Credit API running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'lotus-admin-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'lotus-credit-secret-key-change-in-production';
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const assetsPath = path.join(__dirname, '..', 'data', 'assets');
const logosDir = path.join(assetsPath, 'logos');
if (fs.existsSync(assetsPath)) {
  app.use(
    '/assets',
    express.static(assetsPath, {
      // an uploaded SVG is shown as an image only; it can never run scripts if opened directly
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.svg')) res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      },
    }),
  );
}
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const { chat } = require('./assistant');
const accounts = require('./accounts');
const activity = require('./activity');

const { OWNER, loadStore, saveStore, publicUser, canSeeCompany, hasSection, hasFeature } = accounts;
const { logEvent, actorOf } = activity;

const db = require('./db');
const tarball = require('./tarball');
const security = require('./security');
const excel = require('./excel');

/** Companies data lives in the database (every save kept as a version); rules.json is a readable copy. */
const readRules = () => db.readRules();
const writeRules = (data, savedBy, note) => db.writeRules(data, savedBy, note);

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
  db.snapshotTo(path.join(dest, 'lotus.db'));
  fs.writeFileSync(path.join(dest, 'rules.json'), JSON.stringify(db.readRules(), null, 2), 'utf-8');
  if (fs.existsSync(assetsPath)) {
    fs.cpSync(assetsPath, path.join(dest, 'assets'), { recursive: true });
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

/**
 * Whether the device a token was issued to may still be used: a blocked device never,
 * and with device approval on, only a device the owner approved (removing it signs it out).
 */
function deviceAllowed(payload, settings) {
  if (payload.sub === 'owner') return true;
  if (!payload.dev) return !settings.deviceApproval;
  const device = db.findDevice(payload.sub, payload.dev);
  if (!device) return !settings.deviceApproval;
  if (device.status === 'blocked') return false;
  return device.status === 'approved' || !settings.deviceApproval;
}

/** The signed-in account and its token, re-read on every request so disabling an account or device applies at once. */
function resolveSession(req) {
  const token = tokenOf(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const store = loadStore();
    if (!deviceAllowed(payload, store.settings)) return null;
    if (payload.sub === 'owner') return { user: OWNER, payload };
    const user = store.users.find((u) => u.id === payload.sub);
    return user && user.active ? { user: publicUser(user), payload } : null;
  } catch {
    return null;
  }
}

const resolveUser = (req) => resolveSession(req)?.user ?? null;

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
/** Counts one hit for `key` and says whether it went over the limit for this minute (count: false only checks). */
function rateLimited(key, maxPerMinute, count = true) {
  const now = Date.now();
  const w = hits.get(key) || { start: now, n: 0 };
  if (now - w.start > 60000) {
    w.start = now;
    w.n = 0;
  }
  if (count) w.n += 1;
  hits.set(key, w);
  return count ? w.n > maxPerMinute : w.n >= maxPerMinute;
}

function signToken(user, expiresIn, dev) {
  return jwt.sign({ sub: user.id, role: user.role, dev }, JWT_SECRET, { expiresIn });
}

// ---- owner's Google Authenticator

const TOTP_ISSUER = 'Lotus Credit';
const ownerTotpSecret = () => db.getSecret('totpSecret');

/** Accepts a current authenticator code once (the same code can't be used twice). */
function acceptOwnerCode(code) {
  const step = security.verifyTotp(ownerTotpSecret(), code, db.getSecret('totpLastStep') ?? -1);
  if (step === null) return false;
  db.setSecret('totpLastStep', step);
  return true;
}

const deviceTitle = (d) => [d.kind, d.model, d.os, d.browser].filter(Boolean).join(' · ');

/** Records the browser this login comes from; a new one waits for the owner when device approval is on. */
function registerDevice(req, user, settings) {
  const deviceId = security.deviceIdOf(req);
  const keyHash = security.hashDeviceId(deviceId);
  const info = security.describeDevice(req.headers['user-agent'], req.body?.device);
  const now = new Date().toISOString();
  let device = db.findDevice(user.id, keyHash);
  if (!device) {
    const approvedBy =
      user.role === 'owner'
        ? 'جهاز المالك'
        : !settings.deviceApproval
          ? 'قبل تفعيل موافقة الأجهزة'
          : db.countDevices(user.id, 'approved') === 0
            ? 'أول جهاز للحساب'
            : null;
    if (!approvedBy && db.countDevices(user.id, 'pending') >= 20) {
      return { deviceId, keyHash, device: { ...info, status: 'pending' } };
    }
    device = {
      id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      status: approvedBy ? 'approved' : 'pending',
      label: '',
      firstSeen: now,
      ...(approvedBy ? { approvedAt: now, approvedBy } : {}),
    };
    if (!approvedBy) logEvent({ type: 'device_pending', ...actorOf(user), detail: deviceTitle(info) });
  }
  device = { ...device, ...info, ip: req.ip, lastSeen: now };
  db.saveDevice(device, keyHash);
  return { deviceId, keyHash, device };
}

const deviceSummary = (d) => ({ kind: d.kind, model: d.model, os: d.os, browser: d.browser });

/** Checks username + password against the owner and the stored accounts, then the authenticator and the device. */
function attemptLogin(req, res, { adminOnly }) {
  // only wrong passwords count, so a new device re-checking its approval isn't slowed down
  if (rateLimited(`login:${req.ip}`, 10, false)) return res.status(429).json({ error: 'Too many attempts' });
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const where = adminOnly ? 'لوحة الإدارة' : 'التطبيق';
  const store = loadStore();

  let user = null;
  let found = null;
  if (!username || username.toLowerCase() === 'admin') {
    if (accounts.safeEqual(password, ADMIN_PASSWORD)) user = OWNER;
  } else {
    found = accounts.findUser(store, username);
    if (found && found.active && accounts.verifyPassword(password, found) && (!adminOnly || found.role === 'admin')) {
      user = publicUser(found);
    }
  }
  if (!user) {
    rateLimited(`login:${req.ip}`, 10);
    logEvent({ type: 'login_fail', user: username || 'admin', userName: username || 'admin', role: 'unknown' });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.role === 'owner' && ownerTotpSecret()) {
    const otp = req.body.otp;
    if (!otp) return res.status(401).json({ error: 'otp_required' });
    if (rateLimited('otp:owner', 5) || !acceptOwnerCode(otp)) {
      logEvent({ type: 'login_fail', ...actorOf(OWNER), detail: 'كود Google Authenticator غلط' });
      return res.status(401).json({ error: 'otp_required', wrong: true });
    }
  }

  const { deviceId, keyHash, device } = registerDevice(req, user, store.settings);
  security.setDeviceCookie(req, res, deviceId);
  if (device.status === 'blocked') {
    logEvent({ type: 'login_fail', ...actorOf(user), detail: `جهاز محظور: ${deviceTitle(device)}` });
    return res.status(403).json({ error: 'device_blocked', deviceId });
  }
  if (device.status === 'pending' && store.settings.deviceApproval) {
    const code = req.body.deviceCode;
    if (code && device.id && ownerTotpSecret() && !rateLimited(`devcode:${user.id}`, 3) && acceptOwnerCode(code)) {
      db.saveDevice({ ...device, status: 'approved', approvedAt: new Date().toISOString(), approvedBy: 'كود المدير (Google Authenticator)' }, keyHash);
      logEvent({ type: 'device_approve', ...actorOf(user), detail: `بكود المدير: ${deviceTitle(device)}` });
    } else {
      return res.status(403).json({
        error: 'device_pending',
        deviceId,
        device: deviceSummary(device),
        codeAvailable: !!ownerTotpSecret(),
        wrongCode: !!code,
      });
    }
  }

  if (found) {
    found.lastLoginAt = new Date().toISOString();
    saveStore(store);
  }
  logEvent({ type: 'login_ok', ...actorOf(user), detail: `${where} — ${deviceTitle(device)}` });
  return res.json({ token: signToken(user, adminOnly ? '8h' : '30d', keyHash), user, deviceId });
}

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/public-config', (_, res) => {
  res.json({ requireLogin: !!loadStore().settings.requireLogin });
});

app.post('/api/auth/login', (req, res) => attemptLogin(req, res, { adminOnly: false }));

app.get('/api/auth/me', (req, res) => {
  const session = resolveSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  const { user, payload } = session;
  // keep "last seen" of the device fresh (at most every 10 minutes)
  const device = payload.dev ? db.findDevice(user.id, payload.dev) : null;
  if (device && Date.now() - Date.parse(device.lastSeen || 0) > 10 * 60000) {
    db.saveDevice({ ...device, lastSeen: new Date().toISOString(), ip: req.ip }, payload.dev);
  }
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
    writeRules(mergeRulesForUser(readRules(), req.body, req.user), req.user.name, 'حفظ التعديلات');
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
    writeRules(data, req.user.name, 'تعديل شركة');
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
    writeRules(data, req.user.name, 'إضافة شركة');
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
    writeRules(data, req.user.name, 'حذف شركة');
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

const LOGO_TYPES = { png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', gif: 'gif', 'svg+xml': 'svg', svg: 'svg' };

/** Saves an uploaded logo under a fresh name (so browsers never show a cached old one) and removes the previous file. */
function saveLogo(dataUrl, baseName, previousUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return { error: 'Missing image data' };
  const match = dataUrl.match(/^data:image\/([\w.+-]+);base64,(.+)$/);
  const ext = match && LOGO_TYPES[match[1].toLowerCase()];
  if (!ext) return { error: 'Unsupported image type' };
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) return { error: 'Image too large (max 2MB)' };
  const filename = `${baseName}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(logosDir, filename), buffer);
  if (typeof previousUrl === 'string' && previousUrl.startsWith('/assets/logos/')) {
    const old = path.join(logosDir, path.basename(previousUrl.split('?')[0]));
    if (old !== path.join(logosDir, filename)) fs.unlink(old, () => {});
  }
  return { url: `/assets/logos/${filename}` };
}

app.post('/api/admin/companies/:id/logo', requireAdmin('companies'), (req, res) => {
  if (!guardCompany(req, res)) return;
  try {
    const data = readRules();
    const idx = data.companies.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Company not found' });
    const safeId = req.params.id.replace(/[^\w-]/g, '_');
    const { url, error } = saveLogo(req.body.dataUrl, safeId, data.companies[idx].logoUrl);
    if (error) return res.status(400).json({ error });
    data.companies[idx].logoUrl = url;
    writeRules(data, req.user.name, 'رفع شعار');
    logEvent({ type: 'logo_upload', ...actorOf(req.user), companyId: req.params.id, companyName: data.companies[idx].nameAr });
    res.json({ logoUrl: url, company: data.companies[idx] });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

app.post('/api/admin/branding/logo', requireAdmin('branding'), (req, res) => {
  try {
    const data = readRules();
    const { url, error } = saveLogo(req.body.dataUrl, 'app-logo', data.branding?.logoUrl);
    if (error) return res.status(400).json({ error });
    data.branding = { ...(data.branding || {}), logoUrl: url };
    writeRules(data, req.user.name, 'رفع شعار التطبيق');
    logEvent({ type: 'logo_upload', ...actorOf(req.user), detail: 'شعار التطبيق' });
    res.json({ logoUrl: url });
  } catch (err) {
    console.error('App logo upload error:', err);
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
      if (!['png', 'jpg', 'webp', 'gif'].includes(ext)) {
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
    writeRules(data, req.user.name, 'تعديل صورة');
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
    writeRules(data, req.user.name, 'حذف صورة');
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
    if (!['png', 'jpg', 'webp', 'gif'].includes(ext)) {
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
    writeRules(data, req.user.name, 'رفع صورة');
    logEvent({ type: 'media_upload', ...actorOf(req.user), companyId: cid, companyName: company.nameAr, detail: mediaItem.title });
    res.json({ media: mediaItem, company });
  } catch (err) {
    console.error('Coach media upload error:', err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

/**
 * Puts the data from a backup/import folder in place: the database (or older JSON files), then photos.
 * Everything is checked before anything is replaced, and photos are copied in full before the swap.
 */
function restoreDataFrom(dir) {
  const dbFile = path.join(dir, 'lotus.db');
  const rulesFile = path.join(dir, 'rules.json');
  const usersFile = path.join(dir, 'users.json');
  const assetsIn = path.join(dir, 'assets');

  if (fs.existsSync(dbFile)) {
    db.replaceWith(dbFile);
  } else if (fs.existsSync(rulesFile)) {
    const rules = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
    const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf-8')) : null;
    db.writeRules(rules, 'النظام', 'استرجاع نسخة احتياطية');
    if (users) saveStore({ users: users.users || [], settings: users.settings || {} });
  } else {
    throw new Error('لا توجد بيانات في الملف');
  }

  if (fs.existsSync(assetsIn)) {
    const incoming = path.join(DATA_DIR, `assets.incoming-${Date.now()}`);
    const old = path.join(DATA_DIR, `assets.old-${Date.now()}`);
    fs.cpSync(assetsIn, incoming, { recursive: true });
    if (fs.existsSync(assetsPath)) fs.renameSync(assetsPath, old);
    fs.renameSync(incoming, assetsPath);
    fs.rmSync(old, { recursive: true, force: true });
  }
}

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
    if (!fs.existsSync(path.join(dir, 'lotus.db')) && !fs.existsSync(path.join(dir, 'rules.json'))) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    runBackup('before-restore');
    restoreDataFrom(dir);
    logEvent({ type: 'backup_restore', ...actorOf(req.user), detail: path.basename(req.params.name) });

    res.json({ success: true, restored: req.params.name });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

app.get('/api/admin/versions', requireAdmin('backups'), (_, res) => {
  res.json(db.listVersions(60));
});

app.post('/api/admin/versions/:id/restore', requireAdmin('backups'), (req, res) => {
  const id = Number(req.params.id);
  const data = Number.isInteger(id) ? db.getVersion(id) : null;
  if (!data) return res.status(404).json({ error: 'Version not found' });
  writeRules(data, req.user.name, `رجوع لحفظ رقم ${id}`);
  logEvent({ type: 'version_restore', ...actorOf(req.user), detail: `حفظ رقم ${id}` });
  res.json({ success: true });
});

/** All data in one file (database + photos + readable rules.json) for moving to another server. */
app.get('/api/admin/export', requireOwner, async (req, res) => {
  const tmp = fs.mkdtempSync(path.join(DATA_DIR, 'tmp-export-'));
  try {
    const dbCopy = path.join(tmp, 'lotus.db');
    const rulesCopy = path.join(tmp, 'rules.json');
    db.snapshotTo(dbCopy);
    fs.writeFileSync(rulesCopy, JSON.stringify(db.readRules(), null, 2), 'utf-8');
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="lotus-data-${stamp}.tar.gz"`);
    await tarball.writeTarGz(res, [
      { name: 'lotus.db', file: dbCopy },
      { name: 'rules.json', file: rulesCopy },
      { name: 'assets', dir: assetsPath },
    ]);
    logEvent({ type: 'data_export', ...actorOf(req.user) });
  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to export' });
    else res.destroy(err);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/** Loads a file made by the export above (e.g. on a new server). The current data is backed up first. */
app.post('/api/admin/import', requireOwner, async (req, res) => {
  const tmp = fs.mkdtempSync(path.join(DATA_DIR, 'tmp-import-'));
  try {
    const archive = path.join(tmp, 'upload.tar.gz');
    await tarball.saveUpload(req, archive, 4 * 1024 * 1024 * 1024);
    const out = path.join(tmp, 'data');
    tarball.extractTarGz(archive, out);
    if (!fs.existsSync(path.join(out, 'lotus.db')) && !fs.existsSync(path.join(out, 'rules.json'))) {
      return res.status(400).json({ error: 'الملف ده مش ملف بيانات لوتس' });
    }
    runBackup('before-import');
    restoreDataFrom(out);
    logEvent({ type: 'data_import', ...actorOf(req.user) });
    res.json({ success: true, companies: db.readRules().companies.length, users: loadStore().users.length });
  } catch (err) {
    console.error('Import error:', err);
    res.status(400).json({ error: err.message || 'Failed to import' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
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
  db.deleteDevicesOf(req.params.id);
  db.setPortalLogins(req.params.id, []);
  logEvent({ type: 'user_delete', ...actorOf(req.user), detail: `${found.name} (${found.username})` });
  res.json({ success: true });
});

// ---- portal usernames & passwords kept for each branch (the owner fills them in, the branch only reads them)

const clipText = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

function sanitizePortalLogins(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).map((l, i) => ({
    id: clipText(l?.id, 60) || `pl-${Date.now().toString(36)}-${i}`,
    companyId: clipText(l?.companyId, 80),
    label: clipText(l?.label, 80),
    url: clipText(l?.url, 500),
    username: clipText(l?.username, 120),
    password: clipText(l?.password, 200),
    note: clipText(l?.note, 300),
  }));
}

app.get('/api/my/logins', (req, res) => {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Cache-Control', 'no-store');
  res.json(db.getPortalLogins(user.id));
});

app.get('/api/admin/users/:id/logins', requireOwner, (req, res) => {
  if (!loadStore().users.some((u) => u.id === req.params.id)) return res.status(404).json({ error: 'User not found' });
  res.setHeader('Cache-Control', 'no-store');
  res.json(db.getPortalLogins(req.params.id));
});

app.put('/api/admin/users/:id/logins', requireOwner, (req, res) => {
  const found = loadStore().users.find((u) => u.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'User not found' });
  const list = sanitizePortalLogins(req.body?.logins);
  db.setPortalLogins(found.id, list);
  logEvent({ type: 'logins_update', ...actorOf(req.user), detail: `${found.name} — ${list.length} حساب` });
  res.json(list);
});

app.put('/api/admin/settings', requireOwner, (req, res) => {
  const store = loadStore();
  const next = { ...store.settings };
  const changes = [];
  if ('requireLogin' in req.body) {
    next.requireLogin = !!req.body.requireLogin;
    changes.push(next.requireLogin ? 'تفعيل دخول الفروع الإجباري' : 'إلغاء دخول الفروع الإجباري');
    // approving devices only means something when everyone has to sign in
    if (!next.requireLogin) next.deviceApproval = false;
  }
  if ('deviceApproval' in req.body) {
    next.deviceApproval = !!req.body.deviceApproval;
    changes.push(next.deviceApproval ? 'تفعيل موافقة الأجهزة الجديدة' : 'إلغاء موافقة الأجهزة الجديدة');
    if (next.deviceApproval) next.requireLogin = true;
  }
  store.settings = next;
  saveStore(store);
  logEvent({ type: 'settings_update', ...actorOf(req.user), detail: changes.join('، ') });
  res.json(store.settings);
});

// ---- devices & Google Authenticator (owner only)

app.get('/api/admin/devices', requireOwner, (req, res) => {
  const store = loadStore();
  const names = Object.fromEntries(store.users.map((u) => [u.id, { name: u.name, username: u.username, role: u.role }]));
  names.owner = { name: OWNER.name, username: OWNER.username, role: 'owner' };
  const order = { pending: 0, approved: 1, blocked: 2 };
  const devices = db
    .listDevices()
    .filter((d) => req.query.status !== 'pending' || d.status === 'pending')
    .map((d) => ({ ...d, account: names[d.userId] || { name: 'حساب محذوف', username: '', role: 'branch' } }))
    .sort((a, b) => order[a.status] - order[b.status] || String(b.lastSeen).localeCompare(String(a.lastSeen)));
  res.json({
    deviceApproval: !!store.settings.deviceApproval,
    requireLogin: !!store.settings.requireLogin,
    totpEnabled: !!ownerTotpSecret(),
    devices,
  });
});

app.put('/api/admin/devices/:id', requireOwner, (req, res) => {
  const device = db.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { keyHash, ...current } = device;
  const next = { ...current };
  if (typeof req.body.label === 'string') next.label = req.body.label.trim().slice(0, 60);
  if (['approved', 'blocked'].includes(req.body.status) && req.body.status !== current.status) {
    if (current.userId === 'owner') return res.status(400).json({ error: 'أجهزة المالك مش بتتحظر — احذفها بدل كده' });
    next.status = req.body.status;
    if (next.status === 'approved') {
      next.approvedAt = new Date().toISOString();
      next.approvedBy = req.user.name;
    }
    logEvent({
      type: next.status === 'approved' ? 'device_approve' : 'device_block',
      ...actorOf(req.user),
      detail: `${deviceTitle(current)}${current.userId !== 'owner' ? ` — ${loadStore().users.find((u) => u.id === current.userId)?.name || ''}` : ''}`,
    });
  }
  db.saveDevice(next, keyHash);
  res.json(next);
});

app.delete('/api/admin/devices/:id', requireOwner, (req, res) => {
  const device = db.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  db.deleteDevice(device.id);
  logEvent({ type: 'device_delete', ...actorOf(req.user), detail: deviceTitle(device) });
  res.json({ success: true });
});

app.post('/api/admin/2fa/setup', requireOwner, (_, res) => {
  const secret = security.newTotpSecret();
  db.setSecret('totpPending', secret);
  res.json({ secret, uri: security.totpUri(secret, 'admin', TOTP_ISSUER) });
});

app.post('/api/admin/2fa/enable', requireOwner, (req, res) => {
  const pending = db.getSecret('totpPending');
  const step = pending ? security.verifyTotp(pending, req.body.code) : null;
  if (step === null) return res.status(400).json({ error: 'الكود غلط — اكتب الكود الظاهر دلوقتي في التطبيق' });
  db.setSecret('totpSecret', pending);
  db.setSecret('totpLastStep', step);
  db.setSecret('totpPending', null);
  logEvent({ type: 'twofa_enable', ...actorOf(req.user) });
  res.json({ totpEnabled: true });
});

app.post('/api/admin/2fa/disable', requireOwner, (req, res) => {
  if (!ownerTotpSecret()) return res.json({ totpEnabled: false });
  if (rateLimited('otp:owner', 5) || !acceptOwnerCode(req.body.code)) {
    return res.status(400).json({ error: 'الكود غلط — اكتب الكود الظاهر دلوقتي في التطبيق' });
  }
  db.setSecret('totpSecret', null);
  db.setSecret('totpLastStep', null);
  logEvent({ type: 'twofa_disable', ...actorOf(req.user) });
  res.json({ totpEnabled: false });
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
  version_restore: 'رجوع لحفظ سابق',
  data_export: 'تنزيل كل البيانات',
  data_import: 'رفع ملف بيانات',
  logins_update: 'تعديل بيانات دخول الروابط',
  device_pending: 'جهاز جديد يطلب الدخول',
  device_approve: 'الموافقة على جهاز',
  device_block: 'حظر جهاز',
  device_delete: 'حذف جهاز',
  twofa_enable: 'تفعيل Google Authenticator',
  twofa_disable: 'إلغاء Google Authenticator',
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

const sendXlsx = (res, name, buffer) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(Buffer.from(buffer));
};

/** The dashboard for the chosen dates as an Excel file (summary, days, companies, branches, activity log). */
app.get('/api/admin/reports.xlsx', requireAdmin('dashboard'), async (req, res) => {
  try {
    const { range, events } = eventsFor(req);
    const names = Object.fromEntries(readRules().companies.map((c) => [c.id, c.nameAr]));
    const report = activity.summarize(events, range, names);
    const logRows = activity.filterEvents(events, req.query);
    const buffer = await excel.reportWorkbook({ report, events: logRows, range, labels: EVENT_LABELS, title: 'صيدليات لوتس' });
    sendXlsx(res, `lotus-report-${range.from}_${range.to}.xlsx`, buffer);
  } catch (err) {
    console.error('Excel report error:', err);
    res.status(500).json({ error: 'Failed to build Excel' });
  }
});

app.get('/api/admin/logs.xlsx', requireAdmin('dashboard'), async (req, res) => {
  try {
    const { range, events } = eventsFor(req);
    const rows = activity.filterEvents(events, req.query);
    sendXlsx(res, `lotus-logs-${range.from}_${range.to}.xlsx`, await excel.logWorkbook({ events: rows, range, labels: EVENT_LABELS, title: 'صيدليات لوتس' }));
  } catch (err) {
    console.error('Excel log error:', err);
    res.status(500).json({ error: 'Failed to build Excel' });
  }
});

/** Things waiting on the admin, shown as a notice when the admin panel opens. */
app.get('/api/admin/attention', requireAdmin(), (req, res) => {
  const user = req.user;
  const owner = user.role === 'owner';
  const items = [];
  const settings = loadStore().settings;

  if (owner) {
    const pending = db.listDevices().filter((d) => d.status === 'pending').length;
    if (pending) {
      items.push({
        id: 'devices',
        level: 'urgent',
        title: pending === 1 ? 'جهاز جديد مستني موافقتك' : `${pending} أجهزة جديدة مستنية موافقتك`,
        detail: 'فرع حاول يدخل من جهاز جديد — وافق أو احظر.',
        tab: 'devices',
      });
    }
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'lotus-admin-2026' || !process.env.JWT_SECRET) {
      items.push({
        id: 'default-password',
        level: 'urgent',
        title: 'كلمة سر الأدمن لسه الافتراضية',
        detail: 'الكود منشور على GitHub، فأي حد ممكن يعرفها. لازم تتغير من ملف .env على السيرفر.',
      });
    }
  }

  if (hasSection(user, 'dashboard')) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fails = db.eventsBetween(since, new Date(Date.now() + 60000).toISOString()).filter((e) => e.type === 'login_fail');
    if (fails.length >= 5) {
      const names = [...new Set(fails.map((e) => e.userName || e.user))].slice(0, 4).join('، ');
      items.push({
        id: 'failed-logins',
        level: 'warn',
        title: `${fails.length} محاولة دخول فاشلة آخر 24 ساعة`,
        detail: `على: ${names}. راجع سجل النشاط — لو مش من الفروع، غيّر كلمات المرور.`,
        tab: 'dashboard',
      });
    }
  }

  if (hasSection(user, 'backups')) {
    const last = listBackups()[0];
    const age = last ? Date.now() - Date.parse(last.createdAt) : Infinity;
    if (age > 48 * 60 * 60 * 1000) {
      items.push({
        id: 'backup',
        level: 'warn',
        title: 'مفيش نسخة احتياطية من أكتر من يومين',
        detail: 'اعمل نسخة دلوقتي من «النسخ الاحتياطي».',
        tab: 'backups',
      });
    }
  }

  if (owner) {
    if (!settings.requireLogin) {
      items.push({
        id: 'open-app',
        level: 'tip',
        title: 'البرنامج مفتوح لأي حد معاه اللينك',
        detail: 'فعّل «الدخول إجباري» من المستخدمون والفروع.',
        tab: 'users',
      });
    }
    if (!ownerTotpSecret()) {
      items.push({
        id: 'totp',
        level: 'tip',
        title: 'Google Authenticator مش مفعّل',
        detail: 'فعّله عشان محدش يدخل لوحة الإدارة حتى لو عرف كلمة السر.',
        tab: 'devices',
      });
    }
  }

  res.json({ items });
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

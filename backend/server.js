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
  } catch (err) {
    console.error('Scheduled backup failed:', err);
  }
}, 24 * 60 * 60 * 1000);

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/rules', (_, res) => {
  try {
    res.json(readRules());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load rules' });
  }
});

app.get('/api/companies', (_, res) => {
  try {
    const { companies } = readRules();
    res.json(companies);
  } catch {
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

app.get('/api/companies/:id', (req, res) => {
  try {
    const { companies } = readRules();
    const company = companies.find((c) => c.id === req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch {
    res.status(500).json({ error: 'Failed to load company' });
  }
});

app.post('/api/assistant/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const rules = readRules();
    const result = await chat(message, rules);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Assistant failed', answer: 'معلش حصل خطأ، جرب تاني.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.put('/api/admin/rules', authMiddleware, (req, res) => {
  try {
    writeRules(req.body);
    res.json({ success: true, message: 'Rules updated successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to save rules' });
  }
});

app.put('/api/admin/companies/:id', authMiddleware, (req, res) => {
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

app.post('/api/admin/companies', authMiddleware, (req, res) => {
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

app.delete('/api/admin/companies/:id', authMiddleware, (req, res) => {
  try {
    const data = readRules();
    data.companies = data.companies.filter((c) => c.id !== req.params.id);
    writeRules(data);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

app.post('/api/admin/companies/:id/logo', authMiddleware, (req, res) => {
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
    res.json({ logoUrl, company: data.companies[idx] });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

function stripMediaReferences(company, mediaId) {
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
      if (Array.isArray(val)) {
        const filtered = val.filter((id) => id !== mediaId);
        if (filtered.length) company.stepMediaMap[key] = filtered;
        else delete company.stepMediaMap[key];
      } else if (val === mediaId) {
        delete company.stepMediaMap[key];
      }
    }
    if (!Object.keys(company.stepMediaMap).length) delete company.stepMediaMap;
  }
  if (company.pathway && Array.isArray(company.pathway.steps)) {
    for (const step of company.pathway.steps) {
      if (Array.isArray(step.mediaIds)) step.mediaIds = step.mediaIds.filter((id) => id !== mediaId);
    }
  }
  return company;
}

app.put('/api/admin/companies/:id/media/:mediaId', authMiddleware, (req, res) => {
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
    res.json({ media: company.media[mIdx], company });
  } catch (err) {
    console.error('Media update error:', err);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

app.delete('/api/admin/companies/:id/media/:mediaId', authMiddleware, (req, res) => {
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

app.post('/api/admin/companies/:id/media', authMiddleware, (req, res) => {
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
    res.json({ media: mediaItem, company });
  } catch (err) {
    console.error('Coach media upload error:', err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

app.get('/api/admin/backups', authMiddleware, (_, res) => {
  try {
    res.json(listBackups());
  } catch {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

app.post('/api/admin/backups', authMiddleware, (_, res) => {
  try {
    res.json(runBackup('manual'));
  } catch (err) {
    console.error('Manual backup error:', err);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

app.delete('/api/admin/backups/:name', authMiddleware, (req, res) => {
  try {
    const dir = path.join(backupsDir, path.basename(req.params.name));
    if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Backup not found' });
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

app.post('/api/admin/backups/:name/restore', authMiddleware, (req, res) => {
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

    res.json({ success: true, restored: req.params.name });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
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

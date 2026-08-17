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

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
if (fs.existsSync(assetsPath)) {
  app.use('/assets', express.static(assetsPath));
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

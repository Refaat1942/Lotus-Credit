# Lotus Credit 🪷

**Insurance prescription dispensing rules platform for Lotus Pharmacies**

Interactive, animated PWA for pharmacists to access insurance dispensing specifications — works **online and offline**, with **no login required** for pharmacy staff.

## Features

- 📋 **18 insurance companies** with full dispensing rules extracted from `شروط صرف التعاقدات اغسطس 2026.pdf`
- 🔗 **15 approval portal links** parsed from PDF hyperlinks
- ✨ **Animated UI** with step-by-step dispensing wizards
- 📱 **PWA** — install on pharmacy devices, works offline
- 🔓 **Open access** — no authentication for pharmacists
- ⚙️ **Admin panel** at `/admin` to edit specifications
- 🌐 **Deploy-ready** for Hostinger VPS (Docker + Nginx)

## Quick Start (Development)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3001/api/rules
- Admin: http://localhost:5173/admin (password: `lotus-admin-2026`)

## Production Deploy (Hostinger VPS)

```bash
# On VPS (187.124.15.14)
git clone https://github.com/Refaat1942/Lotus-Credit.git /opt/lotus-credit
cd /opt/lotus-credit
export ADMIN_PASSWORD=your-secure-password
docker compose up -d --build
```

Or from local machine:
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh 187.124.15.14
```

Access: **http://187.124.15.14**

## Insurance Companies Included

| Company | System | Hotline |
|---------|--------|---------|
| AXA | Yodawy | 16363 |
| MetLife | i*care | 19097 |
| GlobeMed | i*care | 16784 |
| Nextcare | Pulse | 19154 |
| Mednet | MedNeXt | 17011 |
| Misr Healthcare | Nice Deer | 19114 |
| AMC | Nice Deer | 19462 |
| Medright | ETPA | 16380 |
| Medmark | Zoho CRM | 16816 |
| Bupa | Call Center | 16816 |
| Unicare | Uni-Act | 19389 |
| Atomic Energy | Direct form | — |
| Egycare | Nice Deer | 16426 |
| SehaOne | SehaOne Tech | 16300 |
| Care Plus | Yodawy | 17144 |
| Sesco Care | Direct | WhatsApp |
| Petroshad | Direct | — |
| Sumed | Direct | — |

## Admin Panel

- URL: `/admin`
- Default password: `lotus-admin-2026`
- Change via `ADMIN_PASSWORD` environment variable
- Edit company rules, forms, notes, and prohibitions
- Changes persist to `data/rules.json`

## Project Structure

```
Lotus Credit/
├── backend/          # Express API
├── frontend/         # React + Vite PWA
├── data/
│   ├── rules.json    # Structured dispensing rules
│   └── extracted_raw.json  # Raw PDF extraction
├── deploy/           # Nginx + deploy scripts
├── Dockerfile
└── docker-compose.yml
```

## Source Document

Rules extracted from: **شروط صرف التعاقدات اغسطس 2026.pdf** (August 2026)

© 2026 Lotus Pharmacies

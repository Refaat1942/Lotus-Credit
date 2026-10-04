const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'data', 'logs');
const RETENTION_MONTHS = 24;
const DAY = 24 * 60 * 60 * 1000;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

/** Events pharmacists' browsers may report; everything else is logged by the server itself. */
const CLIENT_EVENT_TYPES = ['company_view', 'coach_start', 'coach_finish'];

const monthFile = (date) => path.join(LOG_DIR, `${date.toISOString().slice(0, 7)}.jsonl`);

function logEvent(event) {
  try {
    const entry = { t: new Date().toISOString(), ...event };
    fs.appendFileSync(monthFile(new Date()), `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch (err) {
    console.error('Activity log write failed:', err);
  }
}

/** Who did it, in the shape stored on every event. */
function actorOf(user) {
  if (!user) return { user: 'guest', userName: 'زائر', role: 'guest' };
  return { user: user.username, userName: user.name || user.username, role: user.role };
}

/**
 * Parses a from/to day range given in the viewer's local time.
 * `tz` is the viewer's offset from UTC in minutes (e.g. 180 for UTC+3).
 */
function parseRange(from, to, tz) {
  const offset = (Number(tz) || 0) * 60000;
  const today = new Date(Date.now() + offset).toISOString().slice(0, 10);
  const f = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : today;
  const t = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : today;
  const [a, b] = f <= t ? [f, t] : [t, f];
  let start = Date.parse(`${a}T00:00:00Z`) - offset;
  const end = Date.parse(`${b}T00:00:00Z`) + DAY - offset;
  if (end - start > 400 * DAY) start = end - 400 * DAY;
  return { from: a, to: b, start, end, offset };
}

function readEvents({ start, end }) {
  const events = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() < end) {
    const file = monthFile(cursor);
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
        if (!line) continue;
        try {
          const e = JSON.parse(line);
          const ts = Date.parse(e.t);
          if (ts >= start && ts < end) events.push(e);
        } catch {
          /* skip a damaged line */
        }
      }
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return events.sort((x, y) => (x.t < y.t ? 1 : -1));
}

function summarize(events, range, companyNames) {
  const localDay = (iso) => new Date(Date.parse(iso) + range.offset).toISOString().slice(0, 10);
  const count = (type) => events.filter((e) => e.type === type).length;

  const daily = {};
  for (let d = Date.parse(`${range.from}T00:00:00Z`); d <= Date.parse(`${range.to}T00:00:00Z`); d += DAY) {
    daily[new Date(d).toISOString().slice(0, 10)] = { companyViews: 0, coachStarts: 0, assistantQuestions: 0 };
  }

  const companies = {};
  const users = {};
  for (const e of events) {
    const day = daily[localDay(e.t)];
    if (e.companyId) {
      const c = (companies[e.companyId] ||= {
        companyId: e.companyId,
        name: companyNames[e.companyId] || e.companyName || e.companyId,
        views: 0,
        coachStarts: 0,
        coachFinishes: 0,
      });
      if (e.type === 'company_view') c.views += 1;
      if (e.type === 'coach_start') c.coachStarts += 1;
      if (e.type === 'coach_finish') c.coachFinishes += 1;
    }
    if (day) {
      if (e.type === 'company_view') day.companyViews += 1;
      if (e.type === 'coach_start') day.coachStarts += 1;
      if (e.type === 'assistant_question') day.assistantQuestions += 1;
    }
    // a failed login is someone typing a name, not that account's activity
    if (e.type === 'login_fail') continue;
    const u = (users[e.user] ||= {
      user: e.user,
      name: e.userName,
      role: e.role,
      companyViews: 0,
      coachStarts: 0,
      coachFinishes: 0,
      assistantQuestions: 0,
      logins: 0,
      lastSeen: e.t,
    });
    if (e.type === 'company_view') u.companyViews += 1;
    if (e.type === 'coach_start') u.coachStarts += 1;
    if (e.type === 'coach_finish') u.coachFinishes += 1;
    if (e.type === 'assistant_question') u.assistantQuestions += 1;
    if (e.type === 'login_ok') u.logins += 1;
  }

  return {
    range: { from: range.from, to: range.to },
    totals: {
      companyViews: count('company_view'),
      coachStarts: count('coach_start'),
      coachFinishes: count('coach_finish'),
      assistantQuestions: count('assistant_question'),
      logins: count('login_ok'),
      failedLogins: count('login_fail'),
      activeUsers: Object.keys(users).filter((k) => k !== 'guest').length,
    },
    topCompanies: Object.values(companies).sort((a, b) => b.views - a.views || b.coachStarts - a.coachStarts),
    daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })),
    byUser: Object.values(users).sort((a, b) => b.companyViews + b.coachStarts - (a.companyViews + a.coachStarts)),
  };
}

function filterEvents(events, { type, user, q }) {
  const needle = String(q || '').trim().toLowerCase();
  return events.filter(
    (e) =>
      (!type || e.type === type) &&
      (!user || e.user === user) &&
      (!needle || JSON.stringify(e).toLowerCase().includes(needle)),
  );
}

function cleanupLogs() {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  const keepFrom = cutoff.toISOString().slice(0, 7);
  for (const name of fs.readdirSync(LOG_DIR)) {
    if (/^\d{4}-\d{2}\.jsonl$/.test(name) && name.slice(0, 7) < keepFrom) fs.rmSync(path.join(LOG_DIR, name));
  }
}

module.exports = { CLIENT_EVENT_TYPES, logEvent, actorOf, parseRange, readEvents, summarize, filterEvents, cleanupLogs };

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'lotus.db');
/** Readable copy of the latest companies data; the database is the source of truth. */
const RULES_MIRROR = path.join(DATA_DIR, 'rules.json');
const LEGACY_USERS = path.join(DATA_DIR, 'users.json');
const LEGACY_LOGS = path.join(DATA_DIR, 'logs');
const KEEP_VERSIONS = 300;

let db;
let rulesCache = null;

function open() {
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      t TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_t ON events (t);
    CREATE TABLE IF NOT EXISTS rules_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      saved_at TEXT NOT NULL,
      saved_by TEXT NOT NULL,
      note TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `);
  rulesCache = null;
  importLegacyFiles();
}

function tx(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** First start on the database: bring in the existing JSON files. They are left on disk untouched. */
function importLegacyFiles() {
  const done = db.prepare("SELECT value FROM settings WHERE key = '_legacyImported'").get();
  if (done) return;
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

  if (count('rules_versions') === 0 && fs.existsSync(RULES_MIRROR)) {
    const raw = fs.readFileSync(RULES_MIRROR, 'utf-8');
    JSON.parse(raw);
    db.prepare('INSERT INTO rules_versions (saved_at, saved_by, note, data) VALUES (?, ?, ?, ?)').run(
      new Date().toISOString(),
      'النظام',
      'نقل البيانات الحالية إلى قاعدة البيانات',
      raw,
    );
    console.log('Database: imported companies data from rules.json');
  }

  if (count('users') === 0 && fs.existsSync(LEGACY_USERS)) {
    try {
      const store = JSON.parse(fs.readFileSync(LEGACY_USERS, 'utf-8'));
      saveUsersAndSettings(store.users || [], store.settings || {});
      console.log(`Database: imported ${(store.users || []).length} accounts from users.json`);
    } catch (err) {
      console.error('Database: could not import users.json', err);
    }
  }

  if (count('events') === 0 && fs.existsSync(LEGACY_LOGS)) {
    const insert = db.prepare('INSERT INTO events (t, type, data) VALUES (?, ?, ?)');
    let n = 0;
    tx(() => {
      for (const name of fs.readdirSync(LEGACY_LOGS).filter((f) => f.endsWith('.jsonl')).sort()) {
        for (const line of fs.readFileSync(path.join(LEGACY_LOGS, name), 'utf-8').split('\n')) {
          try {
            const e = JSON.parse(line);
            insert.run(e.t, e.type, line);
            n += 1;
          } catch {
            /* skip blank or damaged lines */
          }
        }
      }
    });
    if (n) console.log(`Database: imported ${n} activity log entries`);
  }

  if (count('rules_versions') > 0) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('_legacyImported', 'true')").run();
  }
}

// ---- companies data (with full save history)

function readRules() {
  if (!rulesCache) {
    const row = db.prepare('SELECT data FROM rules_versions ORDER BY id DESC LIMIT 1').get();
    if (!row) throw new Error('No companies data');
    rulesCache = row.data;
  }
  return JSON.parse(rulesCache);
}

function writeRules(data, savedBy = 'النظام', note = 'حفظ') {
  const raw = JSON.stringify(data, null, 2);
  tx(() => {
    db.prepare('INSERT INTO rules_versions (saved_at, saved_by, note, data) VALUES (?, ?, ?, ?)').run(
      new Date().toISOString(),
      savedBy,
      note,
      raw,
    );
    db.prepare(
      `DELETE FROM rules_versions WHERE id NOT IN (SELECT id FROM rules_versions ORDER BY id DESC LIMIT ${KEEP_VERSIONS})`,
    ).run();
  });
  rulesCache = raw;
  try {
    fs.writeFileSync(RULES_MIRROR, raw, 'utf-8');
  } catch (err) {
    console.error('Could not update rules.json copy:', err);
  }
}

function listVersions(limit = 50) {
  return db
    .prepare(
      'SELECT id, saved_at AS savedAt, saved_by AS savedBy, note, length(data) AS size FROM rules_versions ORDER BY id DESC LIMIT ?',
    )
    .all(limit);
}

function getVersion(id) {
  const row = db.prepare('SELECT data FROM rules_versions WHERE id = ?').get(id);
  return row ? JSON.parse(row.data) : null;
}

// ---- accounts & settings

function loadUsersAndSettings() {
  const users = db
    .prepare('SELECT data FROM users ORDER BY rowid')
    .all()
    .map((r) => JSON.parse(r.data));
  const settings = Object.fromEntries(
    db
      .prepare('SELECT key, value FROM settings')
      .all()
      .filter((r) => !r.key.startsWith('_'))
      .map((r) => [r.key, JSON.parse(r.value)]),
  );
  return { users, settings };
}

function saveUsersAndSettings(users, settings) {
  tx(() => {
    db.prepare('DELETE FROM users').run();
    const insertUser = db.prepare('INSERT INTO users (id, username, data) VALUES (?, ?, ?)');
    for (const u of users) insertUser.run(u.id, u.username, JSON.stringify(u));
    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    for (const [k, v] of Object.entries(settings)) upsert.run(k, JSON.stringify(v));
  });
}

// ---- activity log

function insertEvent(entry) {
  db.prepare('INSERT INTO events (t, type, data) VALUES (?, ?, ?)').run(entry.t, entry.type, JSON.stringify(entry));
}

function eventsBetween(startIso, endIso) {
  return db
    .prepare('SELECT data FROM events WHERE t >= ? AND t < ? ORDER BY t DESC, id DESC')
    .all(startIso, endIso)
    .map((r) => JSON.parse(r.data));
}

function deleteEventsBefore(iso) {
  db.prepare('DELETE FROM events WHERE t < ?').run(iso);
}

// ---- whole-database copies (backups, moving servers)

/** A consistent copy of the live database, safe to take while the app is running. */
function snapshotTo(file) {
  if (fs.existsSync(file)) fs.rmSync(file);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}

/** Swaps in another database file (after checking it opens and holds companies data). */
function replaceWith(file) {
  const probe = new DatabaseSync(file);
  try {
    const row = probe.prepare('SELECT data FROM rules_versions ORDER BY id DESC LIMIT 1').get();
    if (!row) throw new Error('الملف لا يحتوي على بيانات الشركات');
    JSON.parse(row.data);
  } finally {
    probe.close();
  }
  db.close();
  fs.copyFileSync(file, DB_PATH);
  open();
  fs.writeFileSync(RULES_MIRROR, rulesCache || JSON.stringify(readRules(), null, 2), 'utf-8');
}

open();

module.exports = {
  DB_PATH,
  RULES_MIRROR,
  readRules,
  writeRules,
  listVersions,
  getVersion,
  loadUsersAndSettings,
  saveUsersAndSettings,
  insertEvent,
  eventsBetween,
  deleteEventsBefore,
  snapshotTo,
  replaceWith,
};

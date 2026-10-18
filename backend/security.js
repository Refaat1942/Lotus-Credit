const crypto = require('crypto');

// ---- Google Authenticator codes (TOTP, RFC 6238: 6 digits, 30 seconds, SHA-1)

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of str.replace(/[\s=]/g, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

const newTotpSecret = () => base32Encode(crypto.randomBytes(20));

function totpAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = h[h.length - 1] & 15;
  const num = (h.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(num).padStart(6, '0');
}

/**
 * Checks a 6-digit code (allowing one step of clock drift either way).
 * Returns the time step it matched, or null. A step at or before `lastStep` is refused so a code can't be reused.
 */
function verifyTotp(secret, code, lastStep = -1) {
  const clean = String(code || '').replace(/\s/g, '');
  if (!secret || !/^\d{6}$/.test(clean)) return null;
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now, now - 1, now + 1]) {
    if (step <= lastStep) continue;
    const expected = totpAt(secret, step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return step;
  }
  return null;
}

function totpUri(secret, account, issuer) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ---- device identity

/** Browsers can't read a MAC address, so each browser gets a long random ID kept in a cookie and in local storage. */
const DEVICE_COOKIE = 'lotus_dev';
const validDeviceId = (id) => typeof id === 'string' && /^[a-f0-9]{32,64}$/.test(id);
const newDeviceId = () => crypto.randomBytes(24).toString('hex');
const hashDeviceId = (id) => crypto.createHash('sha256').update(id).digest('hex');

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

/** The browser's device ID: the cookie wins (it survives longest), then what the page sent, else a new one. */
function deviceIdOf(req) {
  const fromCookie = cookieValue(req, DEVICE_COOKIE);
  if (validDeviceId(fromCookie)) return fromCookie;
  const sent = req.body?.deviceId;
  return validDeviceId(sent) ? sent : newDeviceId();
}

function setDeviceCookie(req, res, id) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${DEVICE_COOKIE}=${id}; Max-Age=${5 * 365 * 24 * 3600}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

const clip = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : '');

/** A readable description of the device from its user agent plus the extra hints the page sent. */
function describeDevice(ua, hints = {}) {
  ua = String(ua || '');
  const touch = Number(hints.touchPoints) > 1;
  const isIpad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch);

  let os = 'غير معروف';
  let m;
  if (/iPhone|iPod/.test(ua)) os = (m = ua.match(/OS (\d+)[_.](\d+)/)) ? `iOS ${m[1]}.${m[2]}` : 'iOS';
  else if (isIpad) os = (m = ua.match(/OS (\d+)[_.](\d+)/)) ? `iPadOS ${m[1]}.${m[2]}` : 'iPadOS';
  else if ((m = ua.match(/Android (\d+(\.\d+)?)/))) os = `Android ${m[1]}`;
  else if (/Windows NT 10/.test(ua)) os = parseInt(hints.platformVersion, 10) >= 13 ? 'Windows 11' : 'Windows 10/11';
  else if ((m = ua.match(/Windows NT (\d+\.\d+)/))) os = `Windows (${m[1]})`;
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'متصفح';
  if (/EdgA?\//.test(ua)) browser = 'Edge';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/CriOS|Chrome/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua)) browser = 'Safari';

  let kind = 'كمبيوتر';
  if (isIpad || /Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) kind = 'تابلت';
  else if (/Mobi|iPhone|iPod|Android/.test(ua)) kind = 'موبايل';

  let model = clip(hints.model, 60).trim();
  if (!model && (m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/)) && m[1].trim() !== 'K') model = m[1].trim();
  if (!model && /iPhone/.test(ua)) model = 'iPhone';
  if (!model && isIpad) model = 'iPad';

  return { kind, os, browser, model, screen: clip(hints.screen, 20), ua: ua.slice(0, 300) };
}

module.exports = {
  newTotpSecret,
  verifyTotp,
  totpUri,
  deviceIdOf,
  setDeviceCookie,
  hashDeviceId,
  describeDevice,
};

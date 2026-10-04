const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/** Minimal ustar writer/reader (no dependencies) for the "all data in one file" export. */

function header(name, size, type) {
  const b = Buffer.alloc(512);
  let prefix = '';
  let base = name;
  if (Buffer.byteLength(name) > 100) {
    const cut = name.lastIndexOf('/', 154);
    if (cut <= 0 || Buffer.byteLength(name.slice(cut + 1)) > 100) throw new Error(`Path too long: ${name}`);
    prefix = name.slice(0, cut);
    base = name.slice(cut + 1);
  }
  const octal = (n, len) => `${n.toString(8).padStart(len - 1, '0')}\0`;
  b.write(base, 0, 100, 'utf8');
  b.write(octal(type === '5' ? 0o755 : 0o644, 8), 100);
  b.write(octal(0, 8), 108);
  b.write(octal(0, 8), 116);
  b.write(octal(size, 12), 124);
  b.write(octal(Math.floor(Date.now() / 1000), 12), 136);
  b.write('        ', 148);
  b.write(type, 156);
  b.write('ustar\0', 257);
  b.write('00', 263);
  b.write(prefix, 345, 155, 'utf8');
  let sum = 0;
  for (const byte of b) sum += byte;
  b.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return b;
}

function collect(entries) {
  const files = [];
  const walk = (dir, name) => {
    files.push({ name: `${name}/`, dir: true });
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, `${name}/${e.name}`);
      else if (e.isFile()) files.push({ name: `${name}/${e.name}`, file: full });
    }
  };
  for (const e of entries) {
    if (e.dir) {
      if (fs.existsSync(e.dir)) walk(e.dir, e.name);
    } else if (fs.existsSync(e.file)) files.push({ name: e.name, file: e.file });
  }
  return files;
}

/** Streams a .tar.gz of the given files/folders into `out` (e.g. an HTTP response). */
function writeTarGz(out, entries) {
  return new Promise((resolve, reject) => {
    const gz = zlib.createGzip({ level: 6 });
    gz.on('error', reject);
    out.on('error', reject);
    gz.pipe(out);
    out.on('finish', resolve);
    out.on('close', resolve);

    const files = collect(entries);
    let i = 0;
    const next = () => {
      while (i < files.length) {
        const f = files[i++];
        let ok;
        if (f.dir) {
          ok = gz.write(header(f.name, 0, '5'));
        } else {
          const data = fs.readFileSync(f.file);
          gz.write(header(f.name, data.length, '0'));
          gz.write(data);
          const pad = (512 - (data.length % 512)) % 512;
          ok = gz.write(Buffer.alloc(pad));
        }
        if (!ok) return gz.once('drain', next);
      }
      gz.end(Buffer.alloc(1024));
    };
    next();
  });
}

/** Unpacks a .tar.gz made by writeTarGz into destDir, refusing any path that would leave it. */
function extractTarGz(file, destDir) {
  const buf = zlib.gunzipSync(fs.readFileSync(file));
  const root = path.resolve(destDir);
  fs.mkdirSync(root, { recursive: true });
  let off = 0;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (start, len) => h.toString('utf8', start, start + len).replace(/\0.*$/s, '');
    const name = [str(345, 155), str(0, 100)].filter(Boolean).join('/');
    const size = parseInt(str(124, 12).trim() || '0', 8);
    const type = str(156, 1) || '0';
    off += 512;
    const target = path.resolve(root, name);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error('ملف غير صالح');
    if (type === '5') fs.mkdirSync(target, { recursive: true });
    else if (type === '0') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf.subarray(off, off + size));
    }
    off += Math.ceil(size / 512) * 512;
  }
}

/** Saves a raw request body to disk, stopping if it grows past maxBytes. */
function saveUpload(req, file, maxBytes) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const out = fs.createWriteStream(file);
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        out.destroy();
        reject(new Error('الملف كبير جداً'));
      }
    });
    req.on('error', reject);
    out.on('error', reject);
    out.on('finish', resolve);
    req.pipe(out);
  });
}

module.exports = { writeTarGz, extractTarGz, saveUpload };

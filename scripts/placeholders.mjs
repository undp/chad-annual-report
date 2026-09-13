// Creates a neutral placeholder for every image referenced in en.json that is
// not on disk yet, so the site renders end-to-end while we wait for the real
// exports from Figma. Real assets simply overwrite them, same filenames.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const copy = JSON.parse(readFileSync('src/_data/copy/en.json', 'utf8'));
const paths = new Set();
(function walk(n, key) {
  if (Array.isArray(n)) return n.forEach((v) => walk(v, key));
  if (n && typeof n === 'object') return Object.entries(n).forEach(([k, v]) => walk(v, k));
  if (typeof n === 'string' && /^\/assets\/(img|files)\//.test(n)) paths.add(n);
})(copy, null);
paths.add('/assets/img/chad-map.svg');
paths.add('/assets/img/undp-logo.svg');
paths.add('/assets/img/hero-01.jpg');
paths.add('/assets/img/hero-02.jpg');

let made = 0;
for (const p of paths) {
  const file = join('src', p);
  if (existsSync(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  const ext = extname(file).toLowerCase();
  if (ext === '.svg') {
    writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="placeholder"><rect width="400" height="300" fill="#eff0f3"/><text x="200" y="155" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#54606e">${p.split('/').pop()}</text></svg>\n`);
  } else if (ext === '.jpg' || ext === '.png') {
    execFileSync('python3', ['-c', `from PIL import Image, ImageDraw
im = Image.new('RGB', (1200, 800), (239, 240, 243))
d = ImageDraw.Draw(im)
d.text((40, 40), ${JSON.stringify(p)}, fill=(84, 96, 110))
im.save(${JSON.stringify(file)})`]);
  } else {
    writeFileSync(file, '');
  }
  made++;
}
console.log(`placeholder creati: ${made} (su ${paths.size} asset referenziati)`);

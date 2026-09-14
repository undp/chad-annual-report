// Regenerates src/_data/copy/fr.json from en.json:
// same shape, strings blanked out, translations already present are kept.
// Missing FR strings fall back to EN at render time (see the `t` filter).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const EN = 'src/_data/copy/en.json';
const FR = 'src/_data/copy/fr.json';

const en = JSON.parse(readFileSync(EN, 'utf8'));
const fr = existsSync(FR) ? JSON.parse(readFileSync(FR, 'utf8')) : {};

// Keys that carry structure, not copy: they are always taken from en.json.
const STRUCTURAL = new Set(['id', 'type', 'src', 'value', 'suffix', 'align', 'file', 'image', 'ogImage', 'lang', 'locale', 'dir']);

function merge(enNode, frNode, key) {
  if (Array.isArray(enNode)) {
    return enNode.map((item, i) => merge(item, Array.isArray(frNode) ? frNode[i] : undefined, key));
  }
  if (enNode && typeof enNode === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(enNode)) {
      out[k] = merge(v, frNode && typeof frNode === 'object' ? frNode[k] : undefined, k);
    }
    return out;
  }
  if (typeof enNode === 'string') {
    if (STRUCTURAL.has(key)) return enNode;
    return typeof frNode === 'string' ? frNode : '';
  }
  return frNode === undefined ? enNode : frNode;
}

const merged = merge(en, fr, null);
merged.meta = { ...merged.meta, lang: 'fr', locale: 'fr', dir: 'ltr' };
writeFileSync(FR, JSON.stringify(merged, null, 2) + '\n');

let total = 0, done = 0;
(function count(n, key) {
  if (Array.isArray(n)) return n.forEach((v) => count(v, key));
  if (n && typeof n === 'object') return Object.entries(n).forEach(([k, v]) => count(v, k));
  if (typeof n === 'string' && !STRUCTURAL.has(key)) { total++; if (n.trim()) done++; }
})(merged, null);
console.log(`fr.json aggiornato — ${done}/${total} stringhe tradotte`);

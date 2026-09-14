/**
 * Translation hand-off, both directions.
 *
 *   node scripts/translations.mjs export        → writes the CSV for the translator
 *   node scripts/translations.mjs import <file> → folds the filled column into fr.json
 *
 * The point of the round trip is that nobody edits JSON by hand. The `key`
 * column is the address of the string inside en.json, so a returned file can be
 * merged even if rows were reordered, filtered or left blank — and a blank row
 * is simply a string that still falls back to English at render time.
 *
 * Structural strings (image paths, numerals, layout flags) never reach the
 * sheet: the same exclusion list the FR scaffolding uses, so the two can't
 * disagree about what counts as copy.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const EN = 'src/_data/copy/en.json';
const FR = 'src/_data/copy/fr.json';
const DEFAULT_OUT = 'translations/undp-chad-report_EN-FR.csv';

const STRUCTURAL = new Set(['id', 'type', 'src', 'value', 'suffix', 'align', 'file', 'image', 'ogImage', 'lang', 'locale', 'dir', 'side', 'rot', 'fw', 'w', 'h']);

/* ---------- walking en.json ---------- */

function leaves(node, path = '', key = null, out = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => leaves(v, `${path}[${i}]`, key, out));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) leaves(v, path ? `${path}.${k}` : k, k, out);
  } else if (typeof node === 'string' && !STRUCTURAL.has(key)) {
    out.push({ path, key, value: node });
  }
  return out;
}

/* ---------- describing a string for the translator ---------- */

function sectionOf(path, en) {
  const ch = path.match(/^chapters\[(\d+)\]/);
  if (ch) return `Chapter ${+ch[1] + 1} — ${en.chapters[+ch[1]].title}`;
  if (path === 'modals.close') return 'Interface';
  const modal = path.match(/^modals\.([\w-]+)/);
  if (modal) return `Popup — ${modal[1]}`;
  return {
    meta: 'Page metadata (search engines, social sharing)',
    header: 'Header',
    hero: 'Hero',
    impact: 'Impact figures',
    priorities: 'Priorities',
    closing: 'Closing',
    footer: 'Download band',
    undpFooter: 'UNDP institutional footer',
  }[path.split(/[.[]/)[0]] ?? path.split(/[.[]/)[0];
}

function kindOf(path, key, value) {
  if (key === 'alt' || key === 'imageAlt') return 'alt text';
  if (path.startsWith('meta.')) return 'metadata';
  if (path.startsWith('header.') || key === 'cta' || key === 'close' || key === 'skipToContent') return 'interface';
  if (key === 'title' || key === 'heading' || key === 'kicker' || key === 'figure') return 'heading';
  return value.length > 120 ? 'body copy' : 'short copy';
}

function noteOf(path, key, kind, value) {
  if (kind === 'alt text') return 'Describes the photo for blind readers and for search engines. Never appears on screen.';
  if (path === 'meta.title') return 'Browser tab and Google result. Aim for 60 characters or fewer.';
  if (path === 'meta.description') return 'Google result and link previews. Aim for 155 characters or fewer.';
  if (path.startsWith('hero.titleLines')) return 'One line of the cover headline, set in the wide display face: going much longer than the English forces the whole title down a size.';
  if (path.startsWith('undpFooter.')) return 'UNDP institutional footer — UNDP publishes official wording for these in French; please reuse it verbatim rather than translating.';
  if (kind === 'heading') return `Heading — the layout was drawn around ${value.length} characters.`;
  if (key === 'cta') return 'Button label. Kept lowercase by the design.';
  if (value.includes('**')) return 'The **double asterisks** mark bold words — keep them around the equivalent French words.';
  return '';
}

/* ---------- CSV ---------- */

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvRow = (cells) => cells.map(csvCell).join(',');

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

/* ---------- writing back into fr.json ---------- */

function setAt(root, path, value) {
  const steps = path.match(/[^.[\]]+/g);
  let node = root;
  for (let i = 0; i < steps.length - 1; i++) node = node?.[steps[i]];
  if (node) node[steps[steps.length - 1]] = value;
  return Boolean(node);
}

/* ---------- commands ---------- */

const [, , cmd, arg] = process.argv;
const en = JSON.parse(readFileSync(EN, 'utf8'));

if (cmd === 'export') {
  const fr = JSON.parse(readFileSync(FR, 'utf8'));
  const frLeaves = new Map(leaves(fr).map((l) => [l.path, l.value]));
  const header = ['key', 'section', 'type', 'characters (EN)', 'English', 'French', 'notes'];
  /* Keys that exist but have no English yet (the three popups whose Figma
     artboard is still missing) are held back: an empty row is not a task, it is
     a question, and it belongs in the hand-off note rather than the sheet. */
  const rows = leaves(en).filter((l) => l.value.trim()).map((l) => {
    const kind = kindOf(l.path, l.key, l.value);
    return csvRow([l.path, sectionOf(l.path, en), kind, l.value.length, l.value,
      frLeaves.get(l.path) ?? '', noteOf(l.path, l.key, kind, l.value)]);
  });
  const out = arg || DEFAULT_OUT;
  mkdirSync(dirname(out), { recursive: true });
  /* BOM + CRLF: without them Excel opens a UTF-8 CSV as mojibake. */
  writeFileSync(out, '﻿' + [csvRow(header), ...rows].join('\r\n') + '\r\n');
  console.log(`${out} — ${rows.length} stringhe da tradurre`);
} else if (cmd === 'import') {
  if (!arg) { console.error('uso: node scripts/translations.mjs import <file.csv>'); process.exit(1); }
  const rows = parseCsv(readFileSync(arg, 'utf8'));
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  const iKey = head.indexOf('key');
  const iFr = head.findIndex((h) => h === 'french' || h === 'français' || h === 'francais' || h === 'fr');
  if (iKey < 0 || iFr < 0) { console.error('colonne "key" e "French" non trovate'); process.exit(1); }

  const fr = JSON.parse(readFileSync(FR, 'utf8'));
  let filled = 0, unknown = [];
  for (const row of rows) {
    const key = row[iKey]?.trim();
    const value = (row[iFr] ?? '').trim();
    if (!key || !value) continue;
    if (setAt(fr, key, value)) filled++; else unknown.push(key);
  }
  writeFileSync(FR, JSON.stringify(fr, null, 2) + '\n');
  const total = leaves(en).length;
  console.log(`fr.json — ${filled}/${total} stringhe importate`);
  if (unknown.length) console.warn(`chiavi non riconosciute (ignorate): ${unknown.slice(0, 10).join(', ')}${unknown.length > 10 ? '…' : ''}`);
} else {
  console.error('uso: node scripts/translations.mjs export [file.csv] | import <file.csv>');
  process.exit(1);
}

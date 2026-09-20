import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/.nojekyll': '.nojekyll' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/fonts': 'assets/fonts' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/img': 'assets/img' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/files': 'assets/files' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/js/bundle.js': 'assets/js/bundle.js' });

  // Fall back to the English string when a FR translation is still missing,
  // so the site always builds even with partial content delivery.
  /* CSS, JS and images are referenced with a hash of their content in the
     query string, so every build that changes a file changes its URL and no
     cache — browser or CDN — can serve the previous version. Only fonts keep
     plain URLs: they never change and are cached for a week by the server. */
  const assetHash = new Map();
  eleventyConfig.addFilter('asset', function (path) {
    if (!assetHash.has(path)) {
      const file = path === '/assets/js/bundle.js' ? 'src/assets/js/bundle.js' : 'src' + path;
      let hash = '';
      try { hash = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8); } catch { hash = String(Date.now()); }
      assetHash.set(path, hash);
    }
    const prefix = process.env.PATH_PREFIX || '/';
    return (prefix.replace(/\/$/, '') + path) + '?v=' + assetHash.get(path);
  });

  eleventyConfig.addFilter('t', function (value, fallback) {
    if (value === undefined || value === null || value === '') return fallback ?? '';
    return value;
  });

  // Merge a translated array with its English fallback, element by element.
  // Needed wherever the template has to *measure* the copy it is about to set
  // — a Nunjucks {% set %} inside a loop does not survive the loop.
  eleventyConfig.addFilter('tList', function (value, fallback) {
    const en = fallback ?? [];
    return en.map((f, i) => {
      const v = Array.isArray(value) ? value[i] : undefined;
      return v === undefined || v === null || v === '' ? f : v;
    });
  });

  // Longest string in a list, in characters. The hero uses it to size its
  // display type against the line that will actually be set, in any language.
  // How far down a block its prints reach: the largest (top offset + bounding
  // height) among them, in artboard px. The block reserves that much so a print
  // taller than the text never runs into the next block.
  eleventyConfig.addFilter('photoExtent', function (photos) {
    return (photos ?? []).reduce((n, p) => Math.max(n, (p.by ?? 0) + (p.bh ?? 0)), 0);
  });

  eleventyConfig.addFilter('maxLen', function (list) {
    return (list ?? []).reduce((n, s) => Math.max(n, String(s ?? '').length), 0);
  });

  // How wide a figure is, in ems of its own font size. A card sets its numeral
  // from its own width, so the cap has to be the real advance width: "1,200" is
  // narrower than "96%" despite having more characters, because the 1 and the
  // comma are narrow. The table is Söhne Breit Fett's own advances, measured in
  // the browser; the 1.5% allowance covers kerning between pairs.
  const SB_ADVANCE = { '0': 0.867, '1': 0.489, '2': 0.77, '3': 0.809, '4': 0.83, '5': 0.774,
    '6': 0.828, '7': 0.775, '8': 0.819, '9': 0.828, ',': 0.276, '.': 0.276, '+': 0.8, '%': 0.986 };
  eleventyConfig.addFilter('figureWidth', function (value, suffix) {
    const n = Number(value);
    const shown = (Number.isFinite(n) ? n.toLocaleString('en-US') : String(value ?? '')) + String(suffix ?? '');
    const em = [...shown].reduce((w, ch) => w + (SB_ADVANCE[ch] ?? 0.83), 0);
    return Math.round(em * 101.5) / 100;
  });

  // The opening statement is one sentence whose two halves are the whole block:
  // the design highlights "immense potential" and "significant challenges" in
  // turn, and the figures below belong to whichever half is lit. Marking them
  // in place rather than splitting the string in three keeps the sentence a
  // sentence for a screen reader, and lets a translator move the phrases
  // wherever French wants them — the filter finds them by text, not position.
  //
  // Each half ships as a button because it is one: it opens its own group of
  // figures. Before the script runs it is an inert button that looks exactly
  // like the design's highlight, and every figure is already on the page.
  /* The opening sentence, marked up for its three states.

     The design draws one continuous yellow outline from the first word of
     "immense potential" to the full stop after "significant challenges" — the
     conjunction between them is inside it — and that outline is the state where
     neither half is chosen. Lighting a half fills that half and takes the
     outline away. So the phrase needs a wrapper of its own: the two buttons
     cannot carry a rule that spans the gap between them. */
  /* La pagina base disegna un solo contorno giallo, dalla prima parola della
     prima metà al punto fermo che chiude la frase: nessun bottone, nessuna metà
     accesa. Le due metà cliccabili appartengono alle varianti del componente e
     arrivano con `site.components`. */
  eleventyConfig.addFilter('outlinePhrase', function (value, halves) {
    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const text = escape(value);
    const a = escape((halves ?? {}).potential);
    const i = a ? text.indexOf(a) : -1;
    if (i < 0) return text;
    return text.slice(0, i) + '<span class="impact__phrase">' + text.slice(i) + '</span>';
  });

  eleventyConfig.addFilter('markHalves', function (value, halves) {
    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const button = (half, phrase) =>
      `<button class="impact__mark" type="button" id="impact-half-${half}"` +
      ` data-half="${half}" aria-controls="impact-panel-${half}">${phrase}</button>`;

    const text = escape(value);
    const a = escape((halves ?? {}).potential);
    const b = escape((halves ?? {}).challenges);
    const ia = a ? text.indexOf(a) : -1;
    const ib = b ? text.indexOf(b, ia + a.length) : -1;

    /* A translation that reorders or rewords the two halves loses the ribbon
       rather than the sentence: the halves still light, the outline sits on
       each of them instead of across both. */
    if (ia < 0 || ib < 0) {
      let out = text;
      if (a) out = out.replace(a, button('potential', a));
      if (b) out = out.replace(b, button('challenges', b));
      return out;
    }

    return text.slice(0, ia) +
      '<span class="impact__phrase">' +
      button('potential', a) +
      text.slice(ia + a.length, ib) +
      button('challenges', b) +
      '</span>' +
      text.slice(ib + b.length);
  });

  // Copy carries emphasis as **double asterisks** so translators edit plain text
  // and can never inject markup; everything else is escaped.
  eleventyConfig.addFilter('emph', function (value) {
    const escaped = String(value ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  });

  // The same copy, stripped for places that take text and not markup: the
  // accessible name of a dialog reads "asterisk asterisk" otherwise.
  eleventyConfig.addFilter('plain', function (value) {
    return String(value ?? '').replace(/\*\*/g, '').replace(/\s*\n+\s*/g, ' ').trim();
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    pathPrefix: process.env.PATH_PREFIX || '/',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
